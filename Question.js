function lerp(a, b, t) {
	return (b - a) * t + a
}

class Question {
	constructor(q_data, q, parent_group) {
		if (!(parent_group instanceof QuestionGroup)) throw new Error("A Question must have a parent QuestionGroup.")
		
		let my_library = parent_group.get_library()
		
		// The parent QuestionGroup
		this.parent_group = parent_group
		
		this.q = null
		this.a = null
		this.hidden_a = []
		this.case_sensitive = false
		
		// Interpret as implicit question.
		if (typeof q_data == "string" || Array.isArray(q_data)) {
			if (!q) throw new LibraryLoadingError(true, q, parent_group, "explicit question must be an object.")
			
			this.q = [q]
			
			if (typeof q_data == "string") {
				this.a = [q_data]
			}
			else {
				// TODO: Check that answers in array are all strings.
				this.a = q_data
			}
		}
		// Interpret as explicit or embedded-explicit question.
		else if (q_data instanceof Object) {
			// The question and answer.
			// The answer can either be a single item or an array of multiple items, all of which are considered acceptable.
			if (q_data["question"]) {
				if (typeof q_data["question"] == "string") {
					this.q = [q_data["question"]]
				}
				else if (Array.isArray(q_data["question"])) {
					// TODO: Check that questions in array are all strings.
					let q_name = q ? "'" + q + "' " : ""
					if (q_data["question"].length == 0) throw new LibraryLoadingError(true, q, parent_group, "parameter 'question' must have at least one element.")
					this.q = q_data["question"]
				}
				else {
					let q_name = q ? "'" + q + "' " : ""
					throw new LibraryLoadingError(true, q, parent_group, "parameter 'question' must be either string or array.")
				}
				
				// Note that if this question's question statement is provided by the key obtained by the caller (and subsequently passed to this function)
				// then it becomes the primary question, and anything specified by the 'question' parameter becomes additional info used only for question inversion.
				if (q) this.q.unshift(q)
			}
			else {
				if (q) this.q = [q]
				else throw new LibraryLoadingError(true, q, parent_group, "required parameter 'question' is missing.")
			}
			
			if (!this.q) throw new Error("Failed to obtain question statement(s)")
			
			if (!q_data["answer"]) throw new LibraryLoadingError(true, this.q[0], parent_group, "required parameter 'answer' is missing.");
			
			if (!q_data["hidden-answer"]) this.hidden_a = []
			else if (typeof q_data["hidden-answer"] == "string") this.hidden_a = [q_data["hidden-answer"]]
			else if (Array.isArray(q_data["hidden-answer"])) {
				// TODO: Validate that q_data["hidden-answer"] is array of strings.
				this.hidden_a = q_data["hidden-answer"]
			}
			else throw new LibraryLoadingError(true, q, parent_group, "parameter 'hidden-answer' must be either string or array of strings.")
			
			if (typeof q_data["answer"] == "string") {
				this.a = [q_data["answer"]]
			}
			else if (Array.isArray(q_data["answer"])) {
				// TODO: Check that answers in array are all strings.
				this.a = q_data["answer"]
			}
			else {
				throw new LibraryLoadingError(true, this.q[0], parent_group, "parameter 'answer' must be object or string.")
			}
			
			if (q_data["case-sensitive"]) {
				if (typeof q_data["case-sensitive"] != "boolean") LibraryLoadingError(true, this.q[0], parent_group, "parameter 'case-sensitive' must be boolean.")
				this.case_sensitive = q_data["case-sensitive"]
			}
			else {
				this.case_sensitive  = false
			}
		}
		else {
			throw new LibraryLoadingError(true, this.q[0], parent_group, "value must be string, array of strings, or valid Question object, not '" + typeof q_data + "'")
		}
		
		// Approximate measure of user's mastery of this question.
		// It is considered mastered when this is above MASTERY_THRESHHOLD
		this.mastery_level = my_library.STARTING_MASTERY
		
		// Used to un-mark the previous attempt
		this.previous_mastery_level = null
		
		// True for the last question that the user answered
		this.was_asked_last = false
		
		// The number of times attempt() has been called on this question
		this.num_attempts = 0
		
		// Whether this question is within the question window.
		// A question is enabled if any of its ancestor QuestionGroups were checked in the menu.
		// However, if windowing is enabled, it cannot appear until it is windowed.
		// A question is activated by the program when it feels the user has a good grip on all the existing windowed questions.
		this.windowed = false
	}
	
	// Returns the library that this Question ultimately descends from.
	get_library() {
		if (this.parent_group != null) {
			return this.parent_group.get_library()
		}
		
		throw new Error("Question has no Library; it has no parent QuestionGroup.")
	}
	
	// Returns true if any of this question's ancestors are enabled.
	// Returns false otherwise.
	get_enabled() {
		if (this.parent_group != null) {
			return this.parent_group.get_enabled()
		}
		
		throw new Error("Question can be neither enabled nor disabled; it has no parent QuestionGroup.")
	}
	
	// Returns whether this question can be picked as the next question the user will see.
	get_active(am_windowed) {
		if (this.windowed && !this.get_enabled()) throw new Error("Cannot be windowed and disabled at once.")
		return am_windowed ? this.windowed : this.get_enabled()
	}
	
	// Checks whether the given answer is correct.
	// Updates responses and recalculates the response_score.
	attempt(response) {
		let my_library = this.get_library()
		
		this.set_was_asked_last()
		this.previous_mastery_level = this.mastery_level
		
		// Determine whether the answer is correct.
		if (this.case_sensitive) {
			var correct = this.a.includes(response) || this.hidden_a.includes(response)
		}
		else {
			var correct = false
			response = response.toLowerCase()
			for (let answer of this.a) {
				if (answer.toLowerCase() == response) {
					correct = true
					break
				}
			}
			
			if (!correct) {
				for (let answer of this.hidden_a) {
					if (answer.toLowerCase() == response) {
						correct = true
						break
					}
				}
			}
		}
		
		// Causes the earlier attempts to have much higher weight than later attempts.
		// Because of this, the actual adaptation rate will always be slightly above the specified constant.
		let altered_adaptation_rate = lerp(my_library.ADAPTATION_RATE, 1, 0.7 * Math.pow(0.7, this.num_attempts))
		this.mastery_level = this.mastery_level * (1 - altered_adaptation_rate) + correct * altered_adaptation_rate
		
//		console.log(this.mastery_level)

		this.was_asked_last = true
		this.num_attempts++
		return correct
	}
	
	// Undoes the result of the last call to attempt(), but leaves was_asked_last unmodified.
	unmark() {
		if (this.previous_mastery_level == null) throw new Error("Cannot unmark unasked question, or question which was already unmarked.")
		if (this.num_attempts <= 0) throw new Error("Question '" + this.get_ancestors_as_string() + "' is in invalid state.")
	
		console.log("Unmarked '" + this.get_ancestors_as_string() + "'")
		this.mastery_level = this.previous_mastery_level
		this.previous_mastery_level = null
		this.num_attempts--
	}
	
	get_mastery() {
		return this.mastery_level
	}
	
	get_remainder() {
		return 1 - this.mastery_level
	}
	
	// Calculates the adaptive weight of this question, for use in choosing random questions with adaptive mode enabled.
	// Note that the actual weight will be this or the reciprocal of the number of questions, whichever is higher.
	get_adaptive_weight() {
		let my_library = this.get_library()
		let raw_weight = 1 / Math.pow(my_library.ADAPTIVE_WEIGHT_BIAS, this.get_mastery())
		//let raw_weight = 1 / Math.pow(my_library.ADAPTIVE_WEIGHT_BIAS, this.get_mastery() / this.get_remainder())
		
		// Additional constant ensures that questions always have some fair chance of being chosen even if its raw_weight is exceptionally small.
		return raw_weight + my_library.ADAPTIVE_WEIGHT_ADDEND
	}
	
	get_weight(am_adaptive, am_windowed) {
		if (am_adaptive) {
			return this.get_active(am_windowed) * this.get_adaptive_weight()
		}
		else {
			return this.get_active(am_windowed) * 1
		}
	}
	
	get_inactive_weight() {
		return (!this.get_active(true)) * 1
	}
	
	// Called from parent QuestionGroup()
	deactivate_all() {
		this.windowed = false
	}
	
	// Sets was_asked_last to true for self and all ancestors.
	set_was_asked_last() {
		this.was_asked_last = true
		this.parent_group.set_was_asked_last()
	}
	
	reset_was_asked_last() {
		this.was_asked_last = false
	}
	
	get_ancestors_as_string() {
		return this.parent_group.get_ancestors_as_string() + " -> " + this.q[0]
	}
	
	// Called when the parent QuestionGroup has chosen this question for activation.
	// The parameters are included so that this function matches the signature of QuestionGroup.activate_question, they are unused.
	activate_question(_am_ordered, _am_adaptive) {
		console.log("Activating " + this.q.toString() + ": " + this.a.toString())
		
		if (this.windowed) throw new Error("Cannot activate a windowed question.")
		this.windowed = true
		return this
	}
	
	/* ---- Do-nothing functions called by recursive QuestionGroup functions ---- */
	
	// Called when the parent QuestionGroup chooses this question for retrieval.
	// The parameter is included so that this function matches the signature of QuestionGroup.get_random, it is unused.
	get_random(_am_adaptive, _am_windowed) {
		return this
	}
	
	// Called by the parent QuestionGroup while recursively resetting expansion on many groups.
	reset_expansion() {}
	
	// Called by parent QuestionGroup while it is attempting to enable itself.
	enable_and_check() {}
}