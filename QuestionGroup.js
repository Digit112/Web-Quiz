// Event Listener for buttons that control the collapsibles.
function collapsible_event() {
	this.classList.toggle("active");
	this.question_group.is_expanded = this.classList.contains("active")
	
	let content = this.parentElement.nextElementSibling
	if (!content) throw new Error ("This header has no associated content. Can't expand it!")
	
	// Toggle display of following block.
	if (content.style.display === "block") {
		content.style.display = "none"
		this.innerHTML = "+"
	}
	else {
		content.style.display = "block"
		this.innerHTML = "-"
	}
}

// Event Listener for checkboxes that select questions.
function check_event() {
	this.question_group.is_enabled = this.checked
	
	if (this.checked) {
		this.question_group.check_all_descendents()
		this.did_recurse_last = false
	}
	else {
		this.question_group.reset_all_descendents()
		
		if (this.question_group.get_enabled()) {
			// Quick failsafe against the possibility of infinite recurse, since the last statement below results in this callback being called again.
			if (this.did_recurse_last) {
				throw new Error("Deja vu (disabled this node and all ancestors yet the node is still enabled. This should be impossible.)")
			}
			this.did_recurse_last = true
				
			// Unchecked a box with a checked ancestor. We must also uncheck all anceestors.
			// All ancestors of this node will propogate their status to their children,
			// except other ancestors of this node, which will all be disabled.
			this.question_group.parent_group.propogate_and_disable()
			
			// The above call would have re-enabled this question (and all its siblings, and the siblings of all descendants of enabled ancestors!)
			// So we must re-disable it.
			this.question_group.disable_and_uncheck()
		}
		else {
			this.did_recurse_last = false
		}
	}
}

// Event Listener for text input used to change a group's name.
function group_name_update() {
	this.question_group.label = this.value
	this.question_group.html_label_element.textContent = this.value
}

// Event Listeners for editing buttons.
function group_move_up() {
	this.question_group.move_up()
	this.question_group.parent_group.regenerate_HTML()
}

function group_move_down() {
	this.question_group.move_down()
	this.question_group.parent_group.regenerate_HTML()
}

function group_new_child() {
	this.question_group.add_child( new QuestionGroup({}, "New Group", this.question_group) )
	this.question_group.is_expanded = true // Force expand the group if it is collapsed.
	this.question_group.regenerate_HTML()
}

function group_delete() {
	let current_parent = this.question_group.parent_group
	current_parent.remove_child(this.question_group)
	
	this.question_group.html_edit_container.replaceChildren()
	current_parent.regenerate_HTML()
}

// Each question group either contains other QuestionGroups or Questions as children.
class QuestionGroup {
	constructor(qg_data, label, parent_group) {
		if (!(parent_group instanceof QuestionGroup || parent_group instanceof Library)) {
			throw new Error("A QuestionGroup must have a parent QuestionGroup or Library.")
		}
		
		if (!(qg_data instanceof Object) || Array.isArray(qg_data)) {
			throw new LibraryLoadingError(true, label, parent_group, "QuestionGroup must be non-Array object.")
		}
		
		// The label for this group that the user will see.
		if (label) {
			this.label = label
		}
		else {
			this.label = qg_data["label"]
			if (!this.label) throw new LibraryLoadingError(true, label, parent_group, "required parameter 'label' is missing.")
		}
	
		console.log("Constructing Group '" + this.label + "'")
		
		// Whether this is a collection of other QuestionGroups or of Questions.
		this.children_are_groups = null
		
		// All children are either QuestionGroups (if children_are_groups is true)
		// or Questions (if children_are_groups is false)
		this.children = []
		
		// The total number of Questions which descend from this group.
		this.weight = 0
		
		// The total number of enabled questions which descend from this group.
		this.enabled_weight = 0
		
		// The total number of windowed questions which descend from this group.
		this.windowed_weight = 0
		
		// The sum of get_adaptive_weight() of all active descended questions.
		// These values are used when getting a random question via tree traversal,
		// but are adjusted to cause a preference for question that are often answered incorrectly.
		this.adaptive_weight = 0
		
		// The estimated probability that the user will incorrectly answer a question randomly chosen from this group.
		// This is the difficulty of each child, times the probability of that child being chosen, summed over all children.
		this.difficulty = 0
		
		// The number of incorrect answers explicitly specified on this group and all ancestors.
		this.num_explicit_incorrect_answers = null;
		
		// The number of incorrect answers offered to this group by its descendants.
		// Excludes answers claimed by groups descending from this group.
		// Groups claim all offered answers by setting descendants-give-incorrect-answers to true.
		// Unclaimed answers propagate up.
		this.num_offered_incorrect_answers = null
		
		// Whether the checkbox associated with this Group has been manually checked.
		// The questions that descend from this group are included iff this group OR ANY OF ITS ANCESTORS have been manually checked.
		// To determine whether the questions descending from this group can be used, call get_enabled()
		this.is_enabled = false
		
		// The parent QuestionGroup
		this.parent_group = parent_group
		
		// True if a child question was asked last.
		this.was_asked_last = false
		
		// The checkbox/expand button associated with this group and the containers for its HTML
		// Set by generate_HTML()
		this.check_elem = null
		this.expand_elem = null
		this.html_container = null
		this.html_edit_container = null
		this.html_content_root = null
		this.html_header_root = null
		this.html_label_element = null
		
		// Used by regenerate_HTML() to retain state through a regeneration.
		this.is_expanded = false
		this.currently_editing = false
		
		// Values which are loaded from file
		let children = []
		this.incorrect_answers = null
		
		this.descendants_give_incorrect_answers = null
		this.case_sensitive = null
		this.mode_of_presentation = null
		this.max_choices = null
		this.typo_forgiveness_level = null
		
		// Attempt to interpret as an explicit QuestionGroup.
		if (qg_data["questions"] || qg_data["groups"]) {
			/* ---- Read Inheritables ---- */
			
			// This function is used to handle the repetitive process of attempting to read or inherit a field.
			let attempt_read_inherit = (key) => {
				if (qg_data[key]) return qg_data[key] // read
				else return this.parent_group[key.replaceAll("-", "_")] // inherit
			}
			
			// descendants-give-incorrect-answers
			this.descendants_give_incorrect_answers = attempt_read_inherit("descendants-give-incorrect-answers")
			if (typeof this.descendants_give_incorrect_answers != "boolean")
				throw new LibraryLoadingError(true, this.label, parent_group, "'descendants-give-incorrect-answers' must be a boolean.")
			
			// case-sensitive
			this.case_sensitive = attempt_read_inherit("case-sensitive")
			if (typeof this.case_sensitive != "boolean")
				throw new LibraryLoadingError(true, this.label, parent_group, "'case-sensitive' must be a boolean.")
			
			// mode-of-presentation
			this.mode_of_presentation = attempt_read_inherit("mode-of-presentation", "verbatim")
			if (typeof this.mode_of_presentation != "string")
				throw new LibraryLoadingError(true, this.label, parent_group, "'mode-of-presentation' must be a string.")
			if (!["verbatim", "multiple-choice", "flash-card"].includes(this.mode_of_presentation))
				throw new LibraryLoadingError(true, this.label, parent_group, "'mode-of-presentation' must be one of 'verbatim', 'multiple-choice', or 'flash-card'.")
			
			// max-choices
			this.max_choices = attempt_read_inherit("max-choices")
			if (typeof this.max_choices != "number")
				throw new LibraryLoadingError(true, this.label, parent_group, "'max-choices' must be an integer.")
			if (!Number.isInteger(this.max_choices))
				throw new LibraryLoadingError(true, this.label, parent_group, "'max-choices' must be an integer.")
			
			// typo-forgiveness-level
			this.typo_forgiveness_level = attempt_read_inherit("typo-forgiveness-level")
			if (typeof this.typo_forgiveness_level != "string")
				throw new LibraryLoadingError(true, this.label, parent_group, "'typo-forgiveness-level' must be a string.")
			if (!["none", "low", "medium", "high"].includes(this.typo_forgiveness_level))
				throw new LibraryLoadingError(true, this.label, parent_group, "'typo-forgiveness-level' must be one of 'none', 'low', 'medium', or 'high'.")
			
			// correct-answer-source
			this.correct_answer_source = attempt_read_inherit("correct-answer-source")
			if (typeof this.correct_answer_source != "string")
				throw new LibraryLoadingError(true, this.label, parent_group, "'correct-answer-source' must be a string.")
			if (!["primary", "random"].includes(this.correct_answer_source))
				throw new LibraryLoadingError(true, this.label, parent_group, "'correct-answer-source' must be one of 'primary' or 'random'.")
			
			/* ---- Read Non-Inheritables ---- */
			
			// Read incorrect-answers
			if (qg_data["incorrect-answers"]) {
				if (typeof qg_data["incorrect-answers"] == "string") {
					this.incorrect_answers = [qg_data["incorrect-answers"]]
				}
				else if (Array.isArray(qg_data["incorrect-answers"])) {
					this.incorrect_answers = qg_data["incorrect-answers"]
				}
				else throw new LibraryLoadingError(true, this.label, parent_group, "parameter 'incorrect-answers' must be either string or array of strings.")
			}
			else {
				this.incorrect_answers = []
			}
			
			for (let incorrect_answer of this.incorrect_answers) {
				if (typeof incorrect_answer != "string")
					throw new LibraryLoadingError(true, this.label, parent_group, "parameter 'incorrect-answers' must be either string or array of strings.")
				if (typeof incorrect_answer != "string")
					throw new LibraryLoadingError(true, this.label, parent_group, "parameter 'incorrect-answers' must be either string or array of strings.")
			}
			
			/* ---- Instantiate Children ---- */
			
			// Read and instantiate children
			if (qg_data["questions"]) {
				if (qg_data["groups"]) throw new LibraryLoadingError(true, this.label, parent_group, "'questions' and 'groups' parameters must never appear together.")
				this.children_are_groups = false
				
				if (Array.isArray(qg_data["questions"])) {
					// Interpret questions parameter as list of explicit question definitions.
					for (child of qg_data["questions"]) {
						this.add_child(new Question(child, null, this))
					}
				}
				else if (qg_data["questions"] instanceof Object) {
					// Interpret questions parameter as list of implicit or embedded-explicit question definitions.
					for (let key in qg_data["questions"]) {
						let val = qg_data["questions"][key]
						this.add_child(new Question(val, key, this))
					}
				}
				else {
					throw new LibraryLoadingError(true, this.label, parent_group, "'questions' must be an array or object.")
				}
			}
			else if (qg_data["groups"]) {
				this.children_are_groups = true
				
				if (Array.isArray(qg_data["groups"])) {
					// Interpret groups parameter as list of explicit QuestionGroup definitions.
					for (let child of qg_data["groups"]) {
						this.add_child(new QuestionGroup(child, null, this))
					}
				}
				else if (qg_data["groups"] instanceof Object) {
					// Interpret groups parameter as list of implicit or embedded-explicit QuestionGroup definitions.
					for (let key in qg_data["groups"]) {
						let val = qg_data["groups"][key]
						this.add_child(new QuestionGroup(val, key, this))
					}
				}
				else {
					throw new LibraryLoadingError(true, this.label, parent_group, "'groups' must be an array or object.")
				}
			}
			else {
				console.assert(false)
			}
		}
		// Interpret as implicit QuestionGroup.
		else {
			// Inherit all inheritable properties
			this.descendants_give_incorrect_answers = this.parent_group.descendants_give_incorrect_answers
			this.case_sensitive = this.parent_group.case_sensitive
			this.mode_of_presentation = this.parent_group.mode_of_presentation
			this.max_choices = this.parent_group.max_choices
			this.typo_forgiveness_level = this.parent_group.typo_forgiveness_level
			this.correct_answer_source = this.parent_group.correct_answer_source
			
			// Default all non-inheritables
			this.incorrect_answers = []
			
			// Attempt interpretation as list of implicit and embedded-explicit questions.
			let q_error = null
			try {
				this.children_are_groups = false
				for (let key in qg_data) {
					let val = qg_data[key]
					this.add_child(new Question(val, key, this))
				}
			}
			catch (e) {
				this.children = []
				
				if (e instanceof LibraryLoadingError) {
					q_error = e.toString()
				}
				else throw e
			}
			
			// If previous interpretation failed, attempt interpretation as list of implicit and embedded-explicit QuestionGroups.
			if (q_error) {
				try {
					this.children_are_groups = true
					for (let key in qg_data) {
						let val = qg_data[key]
						this.add_child(new QuestionGroup(val, key, this))
					}
				}
				catch (e) {
					this.children = []
					this.children_are_groups = null
					
					if (e instanceof LibraryLoadingError && e.allow_recurse) {
						let qg_error = e.toString()
						
						throw new LibraryLoadingError(true, this.label, parent_group, "failed to deduce type of definition. No 'questions' or 'groups' parameter is present.\nWhile interpreting as list of implicit and embedded-explicit Question(s), caught error:\n" + q_error + "\nWhile interpreting as list of implicit and embedded-explicit QuestionGroup(s), caught error:\n" + qg_error, false)
					}
					else throw e
				}
			}
		}
		
		console.assert(typeof this.children_are_groups == "boolean", "Failed to determine child type.")
		
		console.assert(this.descendants_give_incorrect_answers != null, "Failed to obtain descendants-give-incorrect-answers")
		console.assert(this.case_sensitive != null, "Failed to obtain case-sensitive")
		console.assert(this.mode_of_presentation != null, "Failed to obtain case-sensitive")
		console.assert(this.max_choices != null, "Failed to obtain max-choices")
		console.assert(this.typo_forgiveness_level != null, "Failed to obtain typo-forgiveness-level")
		console.assert(this.correct_answer_source != null, "Failed to obtain correct-answer-source")
		
		console.assert(this.incorrect_answers != null, "Failed to obtain incorrect-answers.")
	}
	
	// Returns true if this is the library's root QuestionGroup
	am_root() {
		if (this.parent_group == null)
			throw new Error("QuestionGroup has no relation to a Library; it has no parent.")
		
		return this.parent_group instanceof Library
	}
	
	// Returns the library that this QuestionGroup ultimately descends from.
	get_library() {
		if (this.am_root()) {
			return this.parent_group
		}
		else {
			return this.parent_group.get_library()
		}
	}
	
	// Recalculates terms used in indexing incorrect answers. Recursively recalculates for children.
	// These values are constant during normal use, but could be modified by a user while editing.
	// In that case, they need to be dynamically reloaded.
	recalc_available_incorrect_answers() {
		this.num_explicit_incorrect_answers = this.parent_group.num_explicit_incorrect_answers + this.incorrect_answers.length
		
		if (this.children_are_groups) {
			this.num_offered_incorrect_answers = 0
			for (let child of this.children) {
				child.recalc_available_incorrect_answers()
				
				// If this child passed on the incorrect answers which it sees,
				// include them in the count of available answers for this question.
				if (!child.descendants_give_incorrect_answers) {
					this.num_offered_incorrect_answers += child.num_offered_incorrect_answers
				}
			}
		}
		else {
			this.num_offered_incorrect_answers = this.children.length
		}
		
		console.assert(typeof this.num_explicit_incorrect_answers == "number", "Failed to calculate num_explicit_incorrect_answers")
		console.assert(typeof this.num_offered_incorrect_answers == "number", "Failed to calculate num_offered_incorrect_answers")
		console.assert(!isNaN(this.num_explicit_incorrect_answers), "Failed to calculate num_explicit_incorrect_answers")
		console.assert(!isNaN(this.num_offered_incorrect_answers), "Failed to calculate num_offered_incorrect_answers")
	}
	
	// Returns the number of incorrect answers which have been donated to descendants of this group by other questions.
	// This is the number stored on the nearest ancestor which claims incorrect answers.
	// This function is called by its descendant, recursively, to locate that ancestor,
	// and ultimately to obtain the number of incorrect answers available to a particular question.
	get_num_claimed_incorrect_answers() {
		if (this.descendants_give_incorrect_answers) {
			return this.num_offered_incorrect_answers
		}
		else if (this.am_root()) {
			return 0
		}
		else {
			return this.parent_group.get_num_claimed_incorrect_answers()
		}
	}
	
	// Returns the number of available incorrect answers retrievable from this group,
	// Inherited from Groups above and claimed from Questions below.
	get_num_available_incorrect_answers() {
		return this.get_num_claimed_incorrect_answers() + this.num_explicit_incorrect_answers
	}
	
	// Converts an index into an incorrect-answer.
	get_incorrect_answer_by_index(i, had_encountered_answer_claimant = false) {
		// NOTE the two very similarly named variables!!
		let have_encountered_answer_claimant = had_encountered_answer_claimant || this.descendants_give_incorrect_answers
		
		// Check if the index is into this group.
		if (i < this.incorrect_answers.length) {
			return this.incorrect_answers[i]
		}
		// Otherwise propagate
		else {
			if (this.am_root()) {
				// Index goes beyond all explicitly-specified incorrect answers.
				console.assert(have_encountered_answer_claimant, "Invalid incorrect-answer index should have thrown one initial call.") // We must need to borrow claimed answers...
				
				// Check if the root is the claimant (an edge case)
				if (!had_encountered_answer_claimant) {
					return this.get_claimed_incorrect_answer_by_index(i - this.incorrect_answers.length)
				}
				else {
					return i - this.incorrect_answers.length
				}
			}
			else {
				// Check ancestors for the indexed incorrect answer
				let res = this.parent_group.get_incorrect_answer_by_index(
					i - this.incorrect_answers.length,
					have_encountered_answer_claimant
				)
				
				if (typeof res == "string") {
					// An ancestor had the indexed incorrect answer.
					return res
				}
				else if (typeof res == "number") {
					// The indexed answer is a donated answer of some question descended from the answer claimant.
					
					// The return value of a failed pull is the new index after enumerating available explicitly-specified incorrect answers.
					i = res
					
					// Check if we are the prophesied incorrect answer claimant.
					if (!had_encountered_answer_claimant && have_encountered_answer_claimant) {
						if (i >= this.num_offered_incorrect_answers)
							throw new Error("Invalid index exceeds the number of available incorrect answers.")
						
						return this.get_claimed_incorrect_answer_by_index(i)
					}
					else {
						// Pass control to the caller, a child of this node, until the claimant is found.
						console.assert(had_encountered_answer_claimant, "Claimant appeared to have existed but no longer does, or the claimant returned null.")
						return i
					}
				}
				else {
					console.assert(false)
					return null
				}
			}
		}
		
	}
	
	// Returns the answer to a descendant of this question uniquely identified by the passed integer.
	// If there are multiple answers, picks one at random. Ignores hidden answers.
	// Ignores questions if the path to them from this node passes through a claimant.
	get_claimed_incorrect_answer_by_index(i) {
		// console.log("Getting incorrect answer " + i + " from '" + this.label + "'")
		if (this.children_are_groups) {
			console.assert(i < num_offered_incorrect_answers, "Illegal state. Error should have been thrown before the first call to this recursive functions.")
			
			for (let child of this.children) {
				// Ignore children which are claimants; they block our access to their descendants.
				if (!child.descendants_give_incorrect_answers) {
					if (i >= child.num_offered_incorrect_answers) {
						i -= child.num_offered_incorrect_answers
					}
					else {
						return child.get_claimed_incorrect_answer_by_index(i)
					}
				}
			}
			
			console.assert(false, "The sums of the offered answers on non-claimant children appear to exceed the offered answers on this question (these things should be equal!)")
		}
		else {
			console.assert(i < this.children.length, "Illegal state. Error should have been thrown before the first call to this recursive functions.")
			
			let answer_i = Math.floor(Math.random() * this.children[i].a.length);
			return this.children[i].a[answer_i]
		}
	}
	
	// Returns the weight of this node for use in selecting a random question.
	get_weight(am_adaptive, am_windowed) {
		if (am_adaptive) {
			// Note that adaptive weight itself also depends on the value of am_windowed
			// that was passed to cache_weights()
			return this.adaptive_weight
		}
		else {
			if (am_windowed) {
				return this.windowed_weight
			}
			else {
				return this.enabled_weight
			}
		}
	}
	
	// Returns the number of enabled, inactive descendant questions.
	// Used in choosing questions for activation.
	get_inactive_weight() {
		return this.enabled_weight - this.windowed_weight
	}
	
	// Sets a single inactive question to active and updates the relevant weights.
	// If am_ordered, sets the left-most enabled, inactive child to active. This causes questions to be activated in order.
	// Otherwise, choose a random enabled question.
	// Returns null if unable to activate any question. Returns the question otherwise.
	// am_adaptive must be provided so that the difficulties can be appropriately recalculated.
	activate_question(am_ordered, am_adaptive) {
//		console.log("Performing activation: " + am_ordered + ", " + am_adaptive)
		if (this.get_inactive_weight() == 0) return null // No questions to activate.
		
		let random = 0
		if (!am_ordered) random = Math.random() * this.get_inactive_weight()
		
		let sum = 0
		for (let i = 0; i < this.children.length; i++) {
			sum += this.children[i].get_inactive_weight()
			if (random < sum) {
				// Activate descendant question.
//				console.log("Activating child " + i + ": " + (this.children_are_groups ? this.children[i].label : this.children[i].q))
				let ret = this.children[i].activate_question(am_ordered, am_adaptive)
				if (ret == null) throw new Error("Invalid weights on this or child[i]")
				
				return ret
			}
		}
		
		return null
	}
	
	// Returns a randomly chosen active question.
	// Will retry until it finds a question where was_asked_last is false.
	// Assumes cache_weights() has been called.
	get_random(am_adaptive, am_windowed) {
//		console.log("Performing retrieval: " + am_adaptive + ", " + am_windowed)
		let my_weight = this.get_weight(am_adaptive, am_windowed)
		// Note that an active question will almost never have an adaptive_weight of zero, it is actually impossible in the math,
		// but it is possible in practice due to floating point precision limitations.
		if (my_weight == 0) {
			return null
		}
		
		let question = null
		for (let i = 0; i < 20; i++) {
			let random = Math.random() * my_weight
			let sum = 0
			
			for (let j = 0; j < this.children.length; j++) {
				sum += this.children[j].get_weight(am_adaptive, am_windowed)
				
				if (random < sum) {
//					console.log("Retrieving child " + i + ": " + (this.children_are_groups ? this.children[j].label : this.children[j].q) + " because " + random + " (/ " + my_weight + ") < " + sum)
					question = this.children[j].get_random(am_adaptive, am_windowed)
					break
				}
			}
			
			if (question == null || !question.was_asked_last) {
				return question
			}
		}
		
		return null
	}
	
	// Adds a child to this object.
	// The passed child must be either a QuestionGroup or a Question, depending on the value of children_are_groups.
	add_child(new_child) {
		if (
			(this.children_are_groups && new_child instanceof QuestionGroup) ||
			(!this.children_are_groups && new_child instanceof Question) 
		) {
			this.children.push(new_child)
			new_child.parent_group = this
			return new_child
		}
		else {
			throw new TypeError("Failed to add child. Parameter must be Question or QuestionGroup, depending on the value of children_are_groups.")
		}
	}
	
	// Removes the passed child from this group. Returns true on success, false otherwise.
	remove_child(child_to_remove) {
		for (let child_i in this.children) {
			if (this.children[child_i] == child_to_remove) {
				this.children.splice(child_i, 1)
				return true
			}
		}
		
		return false
	}
	
	// Returns true if this group is enabled or if any of its ancestors are enabled.
	// Returns false otherwise.
	get_enabled() {
		if (this.am_root()) {
			return this.is_enabled
		}
		else {
			return this.is_enabled || this.parent_group.get_enabled()
		}
	}
	
	// Recursively calculate the weight, windowed_weight, adaptive_weight, and difficulty of this node and all descendants.
	// am_adaptive must be known to calculate difficulty, am_windowed must be known to calculate the windowed_weight.
	cache_weights(am_adaptive, am_windowed, is_any_ancestor_enabled = false) {
		let am_enabled = is_any_ancestor_enabled || this.is_enabled
		
		this.weight = 0
		this.enabled_weight = 0
		this.windowed_weight = 0
		this.adaptive_weight = 0
		this.difficulty = 0
		
		if (this.children_are_groups) {
			// Cache all child weights.
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].cache_weights(am_adaptive, am_windowed, am_enabled)
			}
			
			// Calculate current weights.
			for (let i = 0; i < this.children.length; i++) {
				this.weight += this.children[i].weight
				this.enabled_weight += this.children[i].enabled_weight
				this.windowed_weight += this.children[i].windowed_weight
				this.adaptive_weight += this.children[i].adaptive_weight
			}
			
			// Calculate difficulties.
			if (this.get_weight(am_adaptive, am_windowed) > 0) { // Do not divide by zero! (This happens if we have no active children, or we are adaptive and all active children have an adaptive_weight of 0)
				for (let i = 0; i < this.children.length; i++) {
					// Multiply child difficulty (probability that the user will answer incorrectly given that the next question comes from the child's descendants)
					// by the probability that the question *will* come from that child, given that it comes from any of the children of this node.
					this.difficulty += this.children[i].difficulty * (this.children[i].get_weight(am_adaptive, am_windowed) / this.get_weight(am_adaptive, am_windowed))
				}
			}
		}
		else {
			// Calculate current weights.
			this.weight = this.children.length
			
			if (am_enabled) {
				this.enabled_weight = this.children.length
			
				for (let i = 0; i < this.children.length; i++) {
					if (this.children[i].get_active(am_windowed)) {
						this.adaptive_weight += this.children[i].get_adaptive_weight()
					}
					
					if (this.children[i].windowed) {
						this.windowed_weight += 1
					}
				}
				
				// Calculate difficulties
				if (this.get_weight(am_adaptive, am_windowed) > 0) { // Do not divide by zero!
					for (let i = 0; i < this.children.length; i++) {
						if (this.children[i].get_active(am_windowed)) {
							this.difficulty += this.children[i].get_remainder() * (this.children[i].get_weight(am_adaptive, am_windowed) / this.get_weight(am_adaptive, am_windowed))
						}
					}
				}
			}
		}
	}
	
	// Create HTML that represents this QuestionGroup so that users can interact with the objects.
	// This function is recursive and only needs to be called once on the root.
	// Generated HTML is automatically appended to the node that is passed.
	// If editing_pane is not null, the user will be able to toggle editing with a button. If they toggle it on, editing controls will be added which retain references to the pane.
	generate_HTML(doc_parent, editing_pane = null, currently_editing = false) {
		// Save the container so that this group can regenerate its own HTML when changes occur.
		this.html_container = doc_parent
		this.html_edit_container = editing_pane
		this.currently_editing = currently_editing
		
		// Build collapsible header.
		let header = document.createElement("div")
		header.setAttribute("class", "collapsible_header")
			
		let check_node = document.createElement("input")
		check_node.setAttribute("type", "checkbox")
		check_node.setAttribute("class", "collapsible_check")
		check_node.addEventListener("click", check_event)
		check_node.question_group = this // The checkbox elements know which groups they control.
			
		let text_node = document.createElement("text")
		text_node.textContent = this.label
		
		// Generate child collapsibles.
		if (this.children_are_groups) {
			var content = document.createElement("div")
			content.setAttribute("class", "collapsible_content")
			
			var expand_node = document.createElement("button")
			expand_node.setAttribute("type", "button")
			expand_node.setAttribute("class", "collapsible-button")
			expand_node.textContent = "+"
			expand_node.question_group = this
			expand_node.addEventListener("click", collapsible_event)
			
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].generate_HTML(content, editing_pane, currently_editing)
			}
		}
		
		// Generate editing controls
		if (editing_pane && currently_editing) {
			var edit_node = document.createElement("button")
			edit_node.setAttribute("type", "button")
			edit_node.setAttribute("class", "collapsible-button")
			edit_node.textContent = "edit"
			edit_node.question_group = this
			edit_node.addEventListener("click", () => this.generate_properties_html(editing_pane))
			
			if (!this.am_root()) {
				var move_up_node = document.createElement("button")
				move_up_node.setAttribute("type", "button")
				move_up_node.setAttribute("class", "collapsible-button")
				move_up_node.setAttribute("style", "font-style: normal;")
				move_up_node.textContent = "⯅"
				move_up_node.question_group = this
				move_up_node.addEventListener("click", group_move_up)
				
				var move_down_node = document.createElement("button")
				move_down_node.setAttribute("type", "button")
				move_down_node.setAttribute("class", "collapsible-button")
				move_down_node.setAttribute("style", "font-style: normal;")
				move_down_node.textContent = "⯆"
				move_down_node.question_group = this
				move_down_node.addEventListener("click", group_move_down)
			}
			
			if (this.children_are_groups) {
				var new_group_node = document.createElement("button")
				new_group_node.setAttribute("type", "button")
				new_group_node.setAttribute("class", "collapsible-button collapsible-new-group")
				new_group_node.textContent = "+"
				new_group_node.question_group = this
				new_group_node.addEventListener("click", group_new_child)
			}
		}
			
		if (this.children_are_groups) { this.expand_elem = header.appendChild(expand_node) }
		this.check_elem = header.appendChild(check_node)
		this.html_label_element = header.appendChild(text_node)
		if (editing_pane && currently_editing) {
			header.appendChild(edit_node)
			if (!this.am_root()) {
				header.appendChild(move_up_node)
				header.appendChild(move_down_node)
			}
			if (this.children_are_groups) { header.appendChild(new_group_node) }
		}
		
		this.html_header_root = doc_parent.appendChild(header)
		if (this.children_are_groups) { this.html_content_root = doc_parent.appendChild(content) }
		else { this.html_content_root = null }
	}
	
	// Regenerates the HTML representing this object.
	regenerate_HTML(currently_editing = null) {
		if (!this.html_container) throw new Error("Cannot regenerate HTML if it has not yet already been generated!")
		console.log("Regenerating HTML for '" + this.get_ancestors_as_string() + "' and all children.")
	
		if (!currently_editing) currently_editing = this.currently_editing
		this.currently_editing = currently_editing
		
		// Save references to current elements which will be overwritten by generate_HTML
		let old_content = this.html_content_root
		let old_header = this.html_header_root
		
		// Generate HTML onto a temporary element. Children are extracted and replace existing content/header roots.
		// NOTE: This replaces this.html_content_root and html_header_root with new, presently invisible values.
		let temporary_div = document.createElement("div")
		this.generate_HTML(temporary_div, this.html_edit_container, currently_editing) // New references overwrite old ones.
		
		old_header.replaceWith(this.html_header_root)
		
		// Replace OR delete content pane. Deletion might occur if regenerating after changing children from QuestionGroups to Questions.
		if (old_content) {
			if (this.html_content_root) {
				console.log("Replacing...")
				old_content.replaceWith(this.html_content_root)
			}
			else {
				console.log("Removing...")
				old_content.remove()
			}
		} else {
			if (this.html_content_root) {
				// TODO: Add content if changed from Question to QuestionGroup
			}
		}
		
		// Ensure children are expanded & checked as they were prior to regeneration.
		this.reset_expansion()
		this.reset_all_descendents()
	}
	
	// Used to expand or collapse the HTML associated with this object and all children
	// in order to make it match the value of this.is_expanded.
	// These can desync when regenerating HTML.
	reset_expansion() {
		if (this.children_are_groups) {
			if (this.expand_elem.classList.contains("active") != this.is_expanded) {
				this.expand_elem.click()
			}
			
			for (let child of this.children) {
				child.reset_expansion()
			}
		}
	}
	
	// Generates HTML which can be used to edit this QuestionGroup.
	// Elements are added to the passed HTML element.
	generate_properties_html(editing_pane) {
		console.log("Generating edit HTML onto '" + editing_pane + "'")
		
		if (!this.html_edit_container) throw new Error("Cannot generate editing HTML. No editing pane.")
		
		this.html_edit_container.replaceChildren()
		
		if (!this.am_root()) {
			var hierarchy_node = document.createElement("p")
			hierarchy_node.setAttribute("class", "editing-pane-header-subtitle")
			hierarchy_node.textContent = this.parent_group.get_ancestors_as_string()
		}
		
		let name_edit_label = document.createElement("label")
		name_edit_label.textContent = "Name: "
		name_edit_label.setAttribute("for", "edit-group-name")
		
		let name_edit = document.createElement("input")
		name_edit.setAttribute("type", "text")
		name_edit.setAttribute("value", this.label)
		name_edit.setAttribute("id", "edit-group-name")
		name_edit.question_group = this
		name_edit.addEventListener("change", group_name_update)
		
		let group_delete_button = document.createElement("button")
		group_delete_button.setAttribute("class", "edit-group-delete")
		group_delete_button.textContent = "Delete"
		group_delete_button.question_group = this
		group_delete_button.addEventListener("click", group_delete)
			
		if (!this.am_root()) {
			this.html_edit_container.appendChild(hierarchy_node)
			this.html_edit_container.appendChild(name_edit_label)
			this.html_edit_container.appendChild(name_edit)
			this.html_edit_container.appendChild(group_delete_button)
		}
	}
	
	// Swaps this group with its predecessor in the parent's child list & regenerates HTML.
	// If this is the first child, does nothing.
	move_up() {
		if (this.am_root()) return
		
		for (let i = 0; i < this.parent_group.children.length; i++) {
			let child = this.parent_group.children[i]
			
			if (child === this) {
				if (i == 0) return // Cannot move up any further
				
				// Swap with predecessor
				let temp = this.parent_group.children[i-1]
				this.parent_group.children[i-1] = this.parent_group.children[i]
				this.parent_group.children[i] = temp
				return
			}
		}
	}
	
	// Swaps this group with its successor in the parent's child list & regenerates HTML.
	move_down() {
		if (this.am_root()) return
		
		for (let i = 0; i < this.parent_group.children.length; i++) {
			let child = this.parent_group.children[i]
			
			if (child === this) {
				if (i == this.parent_group.children.length - 1) return // Cannot move down any furthers
				
				// Swap with successor
				let temp = this.parent_group.children[i+1]
				this.parent_group.children[i+1] = this.parent_group.children[i]
				this.parent_group.children[i] = temp
				return
			}
		}
	}
	
	// Disables this element and then unchecks the corresponding HTML.
	// Causes an error if the HTML does not exist.
	// Triggers check_event callback
	disable_and_uncheck() {
		this.is_enabled = false
		this.check_elem.checked = false
	}
	
	// Enables this element and then checks the corresponding HTML.
	// Causes an error if the HTML does not exist.
	// Triggers check_event callback
	enable_and_check() {
		this.is_enabled = true
		this.check_elem.checked = true
	}
	
	// Called by the checkbox event listener to recursively enable all child checkboxes.
	check_all_descendents() {
		if (this.children_are_groups) {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].check_elem.checked = true
				this.children[i].check_all_descendents()
			}
		}
	}
	
	// Called when a question which has not been checked, but is checked because one of its parents is checked, gets unchecked.
	// All overiding parents must be disabled and siblings enabled.
	// Returns the same thing that get_enabled() would return, which is helpful for the recursive calls but likely useless to the initial caller.
	// TODO: Fairly complicated recursive function. PLEASE do not forget to test!
	propogate_and_disable() {
		console.log("Propogating: " + this.label)
		let was_enabled = this.is_enabled
		
		if (this.am_root()) {
			was_enabled = this.parent_group.propogate_and_disable() || was_enabled
		}
		
		if (was_enabled) {
			// Enable all children (propogate enabled-ness)
			for (let child of this.children) {
				child.enable_and_check()
			}
			
			// Disable self
			this.disable_and_uncheck()
		}
		
		return was_enabled
	}
	
	// Called by the checkbox event listener to recursively disable all child checkboxes.
	// Children are only actually reset if they hadn't been previously checked manually.
	reset_all_descendents() {
		if (this.children_are_groups) {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].check_elem.checked = this.children[i].get_enabled() // TODO: this and the other get_enabled() call are both unnecessary.
				this.children[i].reset_all_descendents()
			}
		}
		else {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].windowed &&= this.children[i].get_enabled()
			}
		}
	}
	
	// Sets was_asked_last to true for self and all ancestors.
	// Automatically clears was_asked_last if it is set on any other groups or questions on the same tree, by calling reset_was_asked_last() on the root.
	set_was_asked_last() {
		if (this.am_root()) this.reset_was_asked_last()
		else this.parent_group.set_was_asked_last()
		this.was_asked_last = true
	}
	
	// Recursively sets was_asked_last to false for all questions.
	reset_was_asked_last() {
		this.was_asked_last = false
		for (let i = 0; i < this.children.length; i++) {
			if (this.children[i].was_asked_last) this.children[i].reset_was_asked_last()
		}
	}
	
	// Recursively locates the previously asked question and unmarks it, undoing the result of the last attempt.
	unmark() {
		for (let child of this.children) {
			if (child.was_asked_last) {
				child.unmark()
				break
			}
		}
	}
	
	deactivate_all() {
		for (let i = 0; i < this.children.length; i++) {
			this.children[i].deactivate_all()
		}
	}
	
	// Recursively reset all questions to their default state.
	reset_all(root_call = true) {
		if (this.children_are_groups) {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].reset_all(false)
			}
		}
		else {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].was_asked_last = false
				this.children[i].mastery_level = 0.5
			}
		}
	}
	
	// Returns a string representation of the ancestors of this node.
	// Returns the labels of all ancestors, separated by arrows.
	get_ancestors_as_string() {
		if (this.am_root()) {
			return this.label
		}
		else {
			return this.parent_group.get_ancestors_as_string() + " -> " + this.label
		}
	}
	
	// Prints the weight of this node and all descendants.
	debug_weights(depth = 0) {
		let str = ""
		for (let i = 0; i < depth; i++) str += ". "
		
		str += this.label + ": " + this.weight + "/" + this.enabled_weight + "/" + this.windowed_weight + "/" + this.adaptive_weight + "; " + this.difficulty
		
		if (depth == 0) console.log("label: num questions / enabled / windowed / adaptive / difficulty")
		console.log(str)
		
		if (this.children_are_groups) {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].debug_weights(depth + 1)
			}
		}
	}
	
	// Prints was_asked_last of this node and all descendants.
	debug_was_asked_last(depth = 0) {
		let str = ""
		for (let i = 0; i < depth; i++) str += ". "
		
		str += this.label + ": " + this.was_asked_last
		
		console.log(str)
		
		if (this.children_are_groups) {
			for (let i = 0; i < this.children.length; i++) {
				this.children[i].debug_was_asked_last(depth + 1)
			}
		}
	}
}