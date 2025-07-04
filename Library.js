class LibraryLoadingError extends Error {
  constructor(is_group, label, parent_group, message, allow_recurse = true) {
	let identifier = "null identifier"
	
	if (parent_group) {
		identifier = parent_group.get_ancestors_as_string()
		if (label) identifier += " -> " + label
	}
	else if (label) {
		identifier = label
	}
	
    super("While interpreting " + (is_group ? "QuestionGroup" : "Question") + " '" + identifier + "'; " + message);
	this.allow_recurse = allow_recurse
    this.name = "LibraryLoadingError";
  }
}

function import_event(e) {
	const file = e.target.files[0]; // Get the first selected file
	if (!file) { return }
	
	// File object is now available for further processing
	console.log("Loading '", file.name + "', (" + file.size + " Bytes, " + file.type + ")");

	// You can read the file content using FileReader
	const reader = new FileReader();
	reader.onload = (e) => {
		const library_data = JSON.parse(reader.result);
	
		my_library = new Library(library_data)

		// Generate collapsibles HTML
		my_library.generate_HTML( document.getElementById("collapsibles_root"), document.getElementById("editing-pane"))
		last_active_question = null
		active_question = null
		quiz_score = 0
	};
	
	reader.readAsText(file)
}

// A library serves as an explicit root to a QuestionGroup tree, wrapping its children and questions.
class Library {
	constructor(
		library_data = null,
		ADAPTATION_RATE = 0.15,
		STARTING_MASTERY = 0.5,
		ADAPTIVE_WEIGHT_BIAS = 0.65,
		IDEAL_OVERALL_DIFFICULTY = 0.3
	) {
		this.author = null
		this.title = null
		this.version = null
		
		this.root_q = null
		this.ADAPTATION_RATE = 0.15
		this.STARTING_MASTERY = 0.5
		this.ADAPTIVE_WEIGHT_BIAS = 0.65
		this.IDEAL_OVERALL_DIFFICULTY = 0.3
		
		// Default values that child groups and questions will inherit
		this.descendants_give_incorrect_answers = false
		this.case_sensitive = false
		this.mode_of_presentation = "verbatim"
		this.max_choices = 4
		this.typo_forgiveness_level = "low"
		
		this.num_explicit_incorrect_answers = 0
		this.num_offered_incorrect_answers = 0
		
		// Added to the calculation for all adaptive weights. Prevents the adaptive weight of a question from dropping too low when there are few questions.
		this.ADAPTIVE_WEIGHT_ADDEND = 0.3
		
		// Used during HTML regeneration.
		this.doc_parent = null
		this.editing_pane = null
		this.currently_editing = false
		
		if (library_data) { this.initialize(library_data) }
	}
	
	// Produces HTML corresponding to this library, which allows the selction of question groups or,
	// if "editing" is true, allows the modification of the underlying structure.
	// Deletes all existing children of the passed elements before adding new content.
	// If an editing pane is supplied, and currently_editing is true, then editing options will be displayed.
	// If currently_editing is false, however, the user will merely be shown a button that allows editing and the editing pane will be hidden until they click it.
	// If editing_pane is null, currently_editing is ignored. A button to edit is not generated.
	generate_HTML(doc_parent, editing_pane = null, currently_editing = false) {
		// Delete HTML on existing elements if we are generating onto a new element.
		if (this.doc_parent && this.doc_parent != doc_parent) {
			this.doc_parent.replaceChildren()
		}
		if (this.editing_pane && this.editing_pane != editing_pane) {
			this.editing_pane.replaceChildren()
		}
		
		// Retain information necessary for regeneration.
		this.doc_parent = doc_parent
		this.editing_pane = editing_pane
		this.currently_editing = currently_editing
		
		doc_parent.replaceChildren()
		
		let library_header = document.createElement("div")
		library_header.setAttribute("class", "library-header")
		
		// Create import button and associated invisible file selector.
		// This is the only thing the user will see if the library is empty.
		let import_file_selector = document.createElement("input")
		import_file_selector.setAttribute("type", "file")
		import_file_selector.setAttribute("id", "library-upload")
		import_file_selector.style.display = "none"
		import_file_selector.addEventListener("change", import_event)
		
		let import_button = document.createElement("button")
		import_button.setAttribute("class", "library-header-control")
		import_button.textContent = "Import"
		import_button.addEventListener("click", () => import_file_selector.click())
		
		if (this.root_q) {
			var export_button = document.createElement("button")
			export_button.setAttribute("class", "library-header-control")
			export_button.textContent = "Export"
			
			if (editing_pane) {
				var editing_controls_toggle = document.createElement("button")
				editing_controls_toggle.setAttribute("class", "library-header-control")
				editing_controls_toggle.textContent = currently_editing ? "Disable Editing" : "Enable Editing"
				editing_controls_toggle.addEventListener("click",
					currently_editing ? () => this.remove_editing_controls() : () => {this.generate_editing_controls()}
				)
			}
		}
		
		library_header.appendChild(import_button)
		library_header.appendChild(import_file_selector)
		
		if (this.root_q) {
			library_header.appendChild(export_button)
			
			if (editing_pane) {
				library_header.appendChild(editing_controls_toggle)
			}
		}
			
		doc_parent.appendChild(library_header)
		if (this.root_q) { this.root_q.generate_HTML(doc_parent, editing_pane, currently_editing) }
	}
	
	regenerate_HTML() {
		if (!this.doc_parent) throw new Error("Cannot regenerate HTML, HTML has not yet been generated.")
		this.generate_HTML(this.doc_parent, this.editing_pane, this.currently_editing)
	
		this.root_q.reset_expansion()
		this.root_q.check_elem.checked = this.root_q.get_enabled()
		this.root_q.reset_all_descendents()
	}
	
	generate_editing_controls() {
		this.currently_editing = true
		this.regenerate_HTML()
	}
	
	remove_editing_controls() {
		this.currently_editing = false
		this.regenerate_HTML()
	}
	
	get_new_question_weight(am_adaptive) {
		if(am_adaptive) {
			return 1 / Math.pow(my_library.ADAPTIVE_WEIGHT_BIAS, this.STARTING_MASTERY) + this.ADAPTIVE_WEIGHT_ADDEND
		}
		else {
			return 1
		}
	}
	
	// Called from the constructor if an initialization object is provided.
	// Otherwise, may be called manually after construction.
	// library_data should be the unmodified output of JSON.parse() called on a valid library object,
	// such as that which would routinely be retrieved from a file or the library API.
	initialize(library_data) {
		this.version = library_data["version"]
		if (this.version == null) throw new Error("While interpreting Library object; required parameter 'version' is missing.")
		if (this.version != 1) throw new Error("While interpreting Library object; unsupported version '" + this.version + "'")
		
		this.author = library_data["author"]
		this.title = library_data["title"]
		
		// A Desmos graph showing some of the variables and their nature:
		// https://www.desmos.com/calculator/l9vuo1di6l

		// Mastery level is a property of a question, and ranges between 0 and 1. It is an approximate measure of the percentage of time that the user correctly answers that question.
		// It is important to understand that mastery level changes in an exponential fashion.
		// At a high mastery level, an incorrect answer will significantly decrease the mastery level and a correct answer will only slightly improve it.
		// At a low mastery level, the opposite is true, it will increase rapidly but decrease slowly.

		// After a question, the mastery for that question is recalculated with this formula:
		// new_mastery_level = old_mastery_level * (1 - ADAPTATION_RATE) + did_answer_correctly * ADAPTATION_RATE

		// ADAPTATION_RATE is the rate at which the mastery level changes in response to user answers.
		// At 0, the mastery level never changes.
		// At 1, the mastery level is always 100% if the user answered this question correct last time, 0% if they answered incorrect last time.
		// A low adaptation rate makes the mastery level more precise, but will cause the user to be asked way more questions.

		// The number of consecutive correct answers it takes to go from mastery level b to level t is given by:
		// (log(1-t) - log(1-b)) / log(1-ADAPTATION_RATE)

		// The number of consecutive incorrect answers to go from b to t is:
		// (log(t) - log(b)) / log(1-ADAPTATION_RATE)
		this.ADAPTATION_RATE = library_data["adaptation-rate"]
		if (!this.ADAPTATION_RATE) this.ADAPTATION_RATE = 0.15

		// The mastery level of a question which has not been answered.
		this.STARTING_MASTERY = library_data["starting-mastery"]
		if (!this.STARTING_MASTERY) this.STARTING_MASTERY = 0.5

		// The "remainder" of a question is 1 minus the current mastery level.

		// The weight used for a question in adaptive mode is max(1 / my_library.ADAPTIVE_WEIGHT_BIAS ^ mastery), 1 / num_active_questions)
		// An ADAPTIVE_WEIGHT_BIAS of 1 is the same as having adaptive mode off.
		// As ADAPTIVE_WEIGHT_BIAS increases, mastered questions become increasingly rare.
		// Totally unmastered questions are ADAPTIVE_WEIGHT_BIAS times more likely to be chosen than totally mastered questions.
		this.ADAPTIVE_WEIGHT_BIAS = library_data["adaptive-weight-bias"]
		if (!this.ADAPTIVE_WEIGHT_BIAS) this.ADAPTIVE_WEIGHT_BIAS = 4

		// The overall difficulty is the sum of the remainders of all available questions, each multiplied by their respective probability of being chosen.
		// Since the remainder is an approximate likelihood that the user will answer a question incorrectly,
		// overall difficulty is an approximate measure of the likelihood that the user will get the next question wrong (whatever it happens to be)
		// The question windowing attempts to keep the overall difficulty approximately constant throughout the session.
		// So, IDEAL_OVERALL_DIFFICULTY basically controls how challenging the questions are.
		this.IDEAL_OVERALL_DIFFICULTY = library_data["ideal-overall-difficulty"]
		if (!this.IDEAL_OVERALL_DIFFICULTY) this.IDEAL_OVERALL_DIFFICULTY = 0.3
		
		console.log("Initializing Library...")
		console.log("Adaptation Rate: " + this.ADAPTATION_RATE.toString())
		console.log("Starting Mastery: " + this.STARTING_MASTERY.toString())
		console.log("Adaptive Weight Bias: " + this.ADAPTIVE_WEIGHT_BIAS.toString())
		console.log("Ideal Overall Difficulty: " + this.IDEAL_OVERALL_DIFFICULTY.toString())
		
		let root_qg_data = library_data["question-root"]
		if (!root_qg_data) throw new Error("While interpreting Library; required parameter 'question-root' is missing")
		
		this.root_q = new QuestionGroup(root_qg_data, this.title ? this.title : "All Questions", this)
		this.root_q.recalc_available_incorrect_answers()
		this.root_q.cache_weights()
	}
}
