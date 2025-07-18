function lerp(a, b, t) {
	return (b - a) * t + a
}

class AttemptResult {
	constructor(is_correct, is_exactly_correct) {
		this.is_correct = is_correct
		this.is_exactly_correct = is_exactly_correct
	}
}

class Question {
	constructor(q_data, q, parent_group) {
		if (!(parent_group instanceof QuestionGroup)) throw new Error("A Question must have a parent QuestionGroup.")
		
		let my_library = parent_group.get_library()
		
		// The parent QuestionGroup
		this.parent_group = parent_group
		
		this.q = null
		this.a = null
		
		this.hidden_answers = null
		this.incorrect_answers = null
		
		let q_name = q ? q : "" // Used in reporting an error before acquiring a proper label.
		
		// Interpret as implicit question.
		if (typeof q_data == "string" || Array.isArray(q_data)) {
			if (!q) throw new LibraryLoadingError("Question", "", parent_group, "explicit question must be an object.")
			
			// Inherit all inheritables
			this.case_sensitive = this.parent_group.case_sensitive
			this.mode_of_presentation = this.parent_group.mode_of_presentation
			this.max_choices = this.parent_group.max_choices
			this.typo_forgiveness_level = this.parent_group.typo_forgiveness_level
			this.correct_answer_source = this.parent_group.correct_answer_source
			
			// Default all non-inheritables
			this.hidden_answers = []
			this.incorrect_answers = []
			
			// Question
			this.q = [q]
			
			// Answer(s)
			if (typeof q_data == "string") {
				this.a = [q_data]
			}
			else {
				// TODO: Check that answers in array are all non-empty strings.
				for (let answer of q_data) {
					if (typeof answer != "string" || answer.length == 0)
						throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'answers' must be either a non-empty string or array of non-empty strings.")
				}
				this.a = q_data
			}
		}
		// Interpret as explicit or embedded-explicit question.
		else if (q_data instanceof Object) {
			/* ---- Read Question ---- */
			if (q_data["question"]) {
				if (typeof q_data["question"] == "string") {
					this.q = [q_data["question"]]
				}
				else if (Array.isArray(q_data["question"])) {
					// TODO: Check that questions in array are all non-empty strings.
					if (q_data["question"].length == 0) throw new LibraryLoadingError("Question", q_name, parent_group, "parameter 'question' must have at least one element.")
					this.q = q_data["question"]
				}
				else {
					throw new LibraryLoadingError("Question", q_name, parent_group, "parameter 'question' must be either string or array.")
				}
				
				// Note that if this question's question statement is provided by the key obtained by the caller (and subsequently passed to this function)
				// then it becomes the primary question, and anything specified by the 'question' parameter becomes additional info used only for question inversion.
				if (q) this.q.unshift(q)
			}
			else if (q) {
				this.q = [q]
			}
			else {
				throw new LibraryLoadingError("Question", "", parent_group, "required parameter 'question' is missing.")
			}
			
			if (this.q == null) throw new Error("Failed to obtain question statement")
			/* ---- Read Inheritables ---- */
			
			// This function is used to handle the repetitive process of attempting to read or inherit a field.
			let attempt_read_inherit = (key) => {
				if (q_data[key]) return q_data[key] // read
				else return this.parent_group[key.replaceAll("-", "_")] // inherit
			}
			
			// case-sensitive
			this.case_sensitive = attempt_read_inherit("case-sensitive")
			if (typeof this.case_sensitive != "boolean")
				throw new LibraryLoadingError("Question", this.q[0], parent_group, "'case-sensitive' must be a boolean.")
			
			// mode-of-presentation
			this.mode_of_presentation = attempt_read_inherit("mode-of-presentation", "verbatim")
			if (typeof this.mode_of_presentation != "string")
				throw new LibraryLoadingError("Question", this.q[0], parent_group, "'mode-of-presentation' must be a string.")
			if (!["verbatim", "multiple-choice", "flash-card"].includes(this.mode_of_presentation))
				throw new LibraryLoadingError("Question", this.label, parent_group, "'mode-of-presentation' must be one of 'verbatim', 'multiple-choice', or 'flash-card'.")
			
			// max-choices
			this.max_choices = attempt_read_inherit("max-choices")
			if (typeof this.max_choices != "number")
				throw new LibraryLoadingError("Question", this.q[0], parent_group, "'max-choices' must be an integer.")
			if (!Number.isInteger(this.max_choices))
				throw new LibraryLoadingError("Question", this.label, parent_group, "'max-choices' must be an integer.")
			
			// typo-forgiveness-level
			this.typo_forgiveness_level = attempt_read_inherit("typo-forgiveness-level")
			if (typeof this.typo_forgiveness_level != "string")
				throw new LibraryLoadingError("Question", this.q[0], parent_group, "'typo-forgiveness-level' must be a string.")
			if (!["none", "low", "medium", "high"].includes(this.typo_forgiveness_level))
				throw new LibraryLoadingError("Question", this.label, parent_group, "'typo-forgiveness-level' must be one of 'none', 'low', 'medium', or 'high'.")
			
			// correct-answer-source
			this.correct_answer_source = attempt_read_inherit("correct-answer-source")
			if (typeof this.correct_answer_source != "string")
				throw new LibraryLoadingError("Question", this.q[0], parent_group, "'correct-answer-source' must be a string.")
			if (!["primary", "random"].includes(this.correct_answer_source))
				throw new LibraryLoadingError("Question", this.label, parent_group, "'correct-answer-source' must be one of 'primary' or 'random'.")
			
			/* ---- Read Non-inheritables ---- */
			
			// Read answers
			// The answer can either be a single item or an array of multiple items, all of which are considered acceptable.
			if (q_data["answers"]) {
				if (typeof q_data["answers"] == "string") {
					this.a = [q_data["answers"]]
				}
				else if (Array.isArray(q_data["answers"])) {
					for (let answer of q_data["answers"]) {
						if (typeof answer != "string" || answer.length == 0)
							throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'answers' must be either a non-empty string or array of non-empty strings.")
					}
					this.a = q_data["answers"]
				}
				else {
					throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'answers' must be either string or array of non-empty strings.")
				}
			}
			else {
				throw new LibraryLoadingError("Question", this.q[0], parent_group, "required parameter 'answers' is missing.")
			}
			
			// Read hidden-answers
			if (q_data["hidden-answers"]) {
				if (typeof q_data["hidden-answers"] == "string") {
					this.hidden_answers = [q_data["hidden-answers"]]
				}
				else if (Array.isArray(q_data["hidden-answers"])) {
					for (let hidden_answer of q_data["hidden-answers"]) {
						if (typeof hidden_answer != "string" || hidden_answer.length == 0)
							throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'hidden-answers' must be either a non-empty string or array of non-empty strings.")
					}
					this.hidden_answers = q_data["hidden-answers"]
				}
				else throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'hidden-answers' must be either string or array of non-empty strings.")
			}
			else {
				this.hidden_answers = []
			}
			
			// Read incorrect-answers
			if (q_data["incorrect-answers"]) {
				if (typeof q_data["incorrect-answers"] == "string") {
					this.incorrect_answers = [q_data["incorrect-answers"]]
				}
				else if (Array.isArray(q_data["incorrect-answers"])) {
					for (let incorrect_answer of q_data["incorrect-answers"]) {
						if (typeof incorrect_answer != "string" || incorrect_answer.length == 0)
							throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'incorrect-answers' must be either a non-empty string or array of non-empty strings.")
					}
					this.incorrect_answers = q_data["incorrect-answers"]
				}
				else {
					throw new LibraryLoadingError("Question", this.q[0], parent_group, "parameter 'incorrect-answers' must be either string or array of non-empty strings.")
				}
			}
			else {
				this.incorrect_answers = []
			}
		}
		else {
			throw new LibraryLoadingError("Question", q_name, parent_group, "value must be string, array of strings, or valid Question object, not '" + typeof q_data + "'")
		}
		
		console.assert(this.case_sensitive != null, "Failed to obtain case-sensitive")
		console.assert(this.mode_of_presentation != null, "Failed to obtain mode-of-presentation")
		console.assert(this.max_choices != null, "Failed to obtain max-choices")
		console.assert(this.typo_forgiveness_level != null, "Failed to obtain typo-forgiveness-level")
		console.assert(this.correct_answer_source, "Failed to obtain correct-answer-source")
		
		console.assert(this.a, "Failed to obtain answers")
		console.assert(this.hidden_answers, "Failed to obtain hidden-answers")
		console.assert(this.incorrect_answers, "Failed to obtain incorrect-answers")
		
		// Convert questions and answers into MarkDown entities.
		for (let i = 0; i < this.q.length; i++) {
			this.q[i] = new MarkDown(this.q[i], Library.token_map)
		}
		
		for (let i = 0; i < this.a.length; i++) {
			this.a[i] = new MarkDown(this.a[i], Library.token_map)
		}
		
		for (let i = 0; i < this.incorrect_answers.length; i++) {
			this.incorrect_answers[i] = new MarkDown(this.incorrect_answers[i])
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
	
	reset_progress() {
		this.mastery_level = 0.5
		this.num_attemptes = 0
	}
	
	// Returns a promise for a hash of the primary question statement.
	// Note that the hash of two questions can be the same! In this case, the loading group will decide which is which by looking at the *order* of the questions.
	async get_id() {
		const encoder = new TextEncoder()
		const data = encoder.encode(this.q[0].as_text())
		const hash_buffer = await crypto.subtle.digest("SHA-1", data)
		const byte_array = new Uint8Array(hash_buffer)
		const hash_hex = Array.from(byte_array)
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('')
		
		return hash_hex
	}
	
	// Returns a saveable and loadable object representing the uer's progress.
	async get_progress_object() {
		return {"id": await this.get_id(), "ml": this.mastery_level, "na": this.num_attempts, "iw": this.windowed}
	}
	
	load_progress_object(obj) {
		if (!("id" in obj))
			throw new Error("Cannot load progress object with missing id.")
		
		if (!("ml" in obj) || typeof obj["ml"] != "number" || obj["ml"] < 0 || obj["ml"] > 1)
			throw new Error("Cannot load progress object with missing or invalid property 'mastery-level' (ml).")
		
		if (!("na" in obj) || typeof obj["na"] != "number" || obj["na"] < 0 || !Number.isInteger(obj["na"]))
			throw new Error("Cannot load progress object with missing or invalid property 'num-attempts' (na).")
		
		if (!("iw" in obj) || typeof obj["iw"] != "boolean")
			throw new Error("Cannot load progress object with missing or invalid property 'is-windowed' (iw).")
		
		this.mastery_level = obj["ml"]
		this.num_attemptes = obj["na"]
		this.windowed = obj["iw"]
		if (this.windowed !== false) console.log(obj["iw"])
	}
	
	// Returns the library that this Question ultimately descends from.
	get_library() {
		console.assert(this.parent_group != null, "The QuestionGroup constructor should throw to prevent this assertion from failing.")
		return this.parent_group.get_library()
	}
	
	// Returns the number of incorrect answers available for this question.
	get_num_available_incorrect_answers() {
		return this.incorrect_answers.length + this.parent_group.get_num_available_incorrect_answers()
	}
	
	// Obtains a correct answer to be displayed in multiple-choice presentation.
	// Depending on its properties, the result may be chosen randomly from the answers,
	// Or the primary may be chosen every time.
	get_correct_answer() {
		if (this.correct_answer_source == "primary") {
			return this.a[0]
		}
		else if (this.correct_answer_source == "random") {
			return this.a[Math.floor(Math.random() * this.a.length)]
		}
		else {
			throw new Error("Question has invalid correct-answer-source.")
		}
	}
	
	// Obtains and returns a list of up to the requested number of incorrect answers, if they are available.
	get_incorrect_answers(num_desired_incorrect_answers) {
		if (num_desired_incorrect_answers <= 0)
			throw new Error("Must request at least 1 incorrect answer.")
		
		let num_available_incorrect_answers = this.get_num_available_incorrect_answers()
		
		// Calculate the number of incorrect answers we will actually generate.
		// NOTE: Maximum number of choices on a question is 20.
		let num_answers = Math.min(19, num_desired_incorrect_answers, num_available_incorrect_answers)
		
		let valid_indices = []
		for (let i = 0; i < num_available_incorrect_answers; i++) {
			valid_indices.push(i)
		}
		
		// Fisher-Yates shuffle a sufficient segment of the list of all indices.
		// For each one, obtain and sanity-check the result.
		// Return when we have enough incorrect answers, or after all have been exhausted.
		let ret = []
		for (let i = 0; i < num_available_incorrect_answers; i++) {
			// Pick an index for a random element in the remainder of the array.
			let j = Math.floor(Math.random() * (num_available_incorrect_answers - i) + i)
			
			if (i != j) {
				let temp = valid_indices[i]
				valid_indices[i] = valid_indices[j]
				valid_indices[j] = temp
			}
			
			// Convert incorrect answer indices into incorrect answers.
			// This process is rather involved...
			let incorrect_answer_index = valid_indices[i]
			
			//console.log("Getting incorrect answer " + incorrect_answer_index + "...")
			let incorrect_answer = this.get_incorrect_answer_by_index(incorrect_answer_index)
			//console.log("Got '" + incorrect_answer + "'")
			
			if (!ret.includes(incorrect_answer) && !this.is_exactly_correct(incorrect_answer.as_text())) {
				ret.push(incorrect_answer)
				if (ret.length == num_answers) return ret
			}
		}
		
		return ret
	}
	
	// Converts an index into an incorrect answer.
	// Lower indices pull explicitly specified incorrect answers from this Question,
	// then its parent, its grandparent, and so on to the root.
	// If the index is greater than the number of answers in this question plus all ancestors,
	// begins iterating over children which can provide answers.
	// These would be children of the nearest ancestor to this question which has
	// descendants-give-incorrect-answers set to true.
	// see get_num_available_incorrect_answers() to obtain the maximum index.
	get_incorrect_answer_by_index(i) {
		if (i < 0 || i > this.get_num_available_incorrect_answers())
			throw new Error("Invalid incorrect answer index")
		
		if (i < this.incorrect_answers.length) {
			return this.incorrect_answers[i]
		}
		else {
			return this.parent_group.get_incorrect_answer_by_index(i - this.incorrect_answers.length)
		}
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
	
	// Returns true if the passed response is correct without using typo forgiveness.
	// Despite the name, this does respect the case-sensitive setting on this question,
	// whether it is true or false. This function is ONLY ambivalent to typo forgiveness...
	is_exactly_correct(response) {
		if (!this.case_sensitive) response = response.toLowerCase()
			
		for (let answer of this.a.map((a) => a.as_text())) { // TODO: Implement iterator for raw text of answers.
			if (!this.case_sensitive) answer = answer.toLowerCase()
			if (answer == response) {
				return true
			}
		}
		
		for (let answer of this.hidden_answers) {
			if (!this.case_sensitive) answer = answer.toLowerCase()
			if (answer == response) {
				return true
			}
		}
		
		return false
	}
	
	// Returns true if the passed response is within the typo forgiveness threshold
	// For at least one available answer or hidden-answer.
	is_correct(response) {
		// Check if this is exactly correct (This is typically >20,000 times faster than Levenshtein, according to preliminary tests!)
		if (this.is_exactly_correct(response)) {
			console.log("  '" + response + "' is exactly correct")
			return new AttemptResult(true, true)
		}
		
		if (!this.case_sensitive) response = response.toLowerCase()
		
		// Check if typo forgiveness is enabled. We already know the answer is not exactly correct.
		let typo_divisor = this.get_typo_divisor()
		if (typo_divisor == Infinity) {
			return new AttemptResult(false, false)
		}
		
		for (let answer of this.a.map((a) => a.as_text())) {
			if (!this.case_sensitive) answer = answer.toLowerCase()
			let max_distance = Math.min(Math.round(answer.length / typo_divisor), 6)
			let act_distance = Levenshtein(response, answer, max_distance)
			if (act_distance <= max_distance) {
				console.log("  '" + response + "' is inexactly correct, matching '" + answer + "' with " + act_distance + " of " + max_distance + " typo(s).")
				return new AttemptResult(true, false)
			}
		}
		
		for (let answer of this.hidden_answers) {
			if (!this.case_sensitive) answer = answer.toLowerCase()
			let max_distance = Math.min(Math.round(answer.length / typo_divisor), 6)
			let act_distance = Levenshtein(response, answer, max_distance)
			if (act_distance <= max_distance) {
				console.log("  '" + response + "' is inexactly correct, matching '" + answer + "' with " + act_distance + " of " + max_distance + " typo(s).")
				return new AttemptResult(true, false)
			}
		}
		
		console.log("  '" + response + "' is incorrect.")
		return new AttemptResult(false, false)
	}
	
	// Invalidates the cache of all ancestors
	// NOTE: The cache invalidation is only used to warn a user about unsaved progress. It does not guarantee that cache_weights() will have no effect (yet).
	invalidate_cache() {
		this.parent_group.invalidate_cache()
	}
	
	// Returns the number to divide the length of an answer by to get the number of acceptable typos.
	get_typo_divisor() {
		if (this.typo_forgiveness_level == "none") {
			return Infinity
		}
		else if (this.typo_forgiveness_level == "low") {
			return 15
		}
		else if (this.typo_forgiveness_level == "medium") {
			return 10
		}
		else if (this.typo_forgiveness_level == "high") {
			return 5
		}
		else {
			console.assert(false)
			return null
		}
	}
	
	// Checks whether the given answer is correct.
	// Updates responses and recalculates the response_score.
	attempt(response) {
		let my_library = this.get_library()
		
		this.invalidate_cache()
		this.set_was_asked_last()
		this.previous_mastery_level = this.mastery_level
		
		// Determine whether the answer is correct.
		let attempt_result = this.is_correct(response)
		
		// Causes the earlier attempts to have much higher weight than later attempts.
		// Because of this, the actual adaptation rate will always be slightly above the specified constant.
		let altered_adaptation_rate = lerp(my_library.ADAPTATION_RATE, 1, 0.7 * Math.pow(0.7, this.num_attempts))
		this.mastery_level = this.mastery_level * (1 - altered_adaptation_rate) + attempt_result.is_correct * altered_adaptation_rate
		
		let invalid_mastery_equ = this.previous_mastery_level + " * (1 - " + altered_adaptation_rate + ") + " + attempt_result.is_correct  + " * " + altered_adaptation_rate
		console.assert(!isNaN(this.mastery_level), invalid_mastery_equ)
		console.assert(this.mastery_level != 0, invalid_mastery_equ)
		console.assert(this.mastery_level != 1, invalid_mastery_equ)
		
//		console.log(this.mastery_level)

		this.was_asked_last = true
		this.num_attempts++
		return attempt_result
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
		console.log("  Activating Question '" + this.q.toString() + ": " + this.a.toString() + "'")
		
		if (this.windowed) throw new Error("Cannot activate a windowed question.")
		this.windowed = true
		return this
	}
	
	/* ---- Do-nothing functions called by recursive QuestionGroup functions ---- */
	
	// Called when the parent QuestionGroup chooses this question for retrieval.
	// The parameter is included so that this function matches the signature of QuestionGroup.get_random, it is unused.
	get_random(_am_adaptive, _am_windowed) {
		console.assert(!this.was_asked_last, "Parent group should not have attempted retrieval of this question.")
		return this
	}
	
	// Called by the parent QuestionGroup while recursively resetting expansion on many groups.
	reset_expansion() {}
	
	// Called by parent QuestionGroup while it is attempting to enable itself.
	enable_and_check() {}
}