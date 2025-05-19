class Question {
	constructor(q, a) {
		// The question and answer.
		// The answer can either be a single item or an array of multiple items, all of which are considered acceptable.
		this.q = q
		if (Array.isArray(a)) {
			this.a = a
		}
		else {
			this.a = [a]
		}
		
		// Approximate measure of user's mastery of this question.
		// It is considered mastered when this is above MASTERY_THRESHHOLD
		this.mastery_level = STARTING_MASTERY
		
		// This is true if this was the last question asked.
		this.was_asked_last = false
		
		// The parent QuestionGroup
		this.parent_group = null
		
		// The number of times attempt() has been called on this question
		this.num_attempts = 0
		
		// Whether this question is within the question window.
		// A question is enabled if any of its ancestor QuestionGroups were checked in the menu.
		// However, if windowing is enabled, it cannot appear until it is windowed.
		// A question is activated by the program when it feels the user has a good grip on all the existing windowed questions.
		this.windowed = false
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
		let correct = this.a.includes(response)
		
		// Causes the earlier attempts to have much higher weight than later attempts.
		// Because of this, the actual adaptation rate will always be slightly above the specified constant.
		let altered_adaptation_rate = lerp(ADAPTATION_RATE, 1, 0.7 * Math.pow(0.7, this.num_attempts))
		this.mastery_level = this.mastery_level * (1 - altered_adaptation_rate) + correct * altered_adaptation_rate
		console.log(this.mastery_level)
		this.was_asked_last = true
		
		this.num_attempts++
		return correct
	}
	
	get_mastery() {
		return this.mastery_level
	}
	
	get_remainder() {
		return 1 - this.mastery_level
	}
	
	// Calculates the adaptive weight of this question, for use in choosing random questions with adaptive mode enabled.
	// Note that the actual weight will be this or the reciprical of the number of questions, whichever is higher.
	get_adaptive_weight() {
		return Math.pow(ADAPTIVE_WEIGHT_BIAS, this.get_mastery() / this.get_remainder())
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
	
	// Called when the parent QuestionGroup chooses this question for retrieval.
	// The parameter is included so that this function matches the signature of QuestionGroup.get_random, it is unused.
	get_random(_am_adaptive, _am_windowed) {
		return this
	}
	
	// Called when the parent QuestionGroup has chosen this question for activation.
	// The parameters are included so that this function matches the signature of QuestionGroup.activate_question, they are unused.
	activate_question(_am_ordered, _am_adaptive) {
		console.log("Activating " + this.q + ": " + this.a.toString())
		
		if (this.windowed) throw new Error("Cannot activate a windowed question.")
		this.windowed = true
		return this
	}
}