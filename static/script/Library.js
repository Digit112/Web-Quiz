class LibraryLoadingError extends Error {
  constructor(entity_type, label, parent_group, message, allow_recurse = 2) {
	let identifier = "null identifier"
	
	if (parent_group instanceof QuestionGroup) {
		identifier = parent_group.get_ancestors_as_string()
		if (label != null) identifier += " -> " + label
	}
	else if (label != null) {
		identifier = label
	}
	
    super("While interpreting " + entity_type + " '" + identifier + "'; " + message);
	this.allow_recurse = allow_recurse
    this.name = "LibraryLoadingError";
  }
}

// NOTE: Accesses global my_library!
// TODO: Instead, we should copy-assign a new library to this.
function import_event(e) {
	const file = e.target.files[0]; // Get the first selected file
	e.target.value = ""
	if (!file) return
	
	// Defined in library-loader.js
	reset_interface()
	
	// File object is now available for further processing
	console.log("Loading '", file.name + "', (" + file.size + " Bytes, " + file.type + ")");

	// You can read the file content using FileReader
	const reader = new FileReader();
	reader.onload = (e) => {
		let error = null
		try {
			const library_data = JSON.parse(reader.result)
			my_library = new Library(library_data)
		}
		catch (e) {
			if (e instanceof SyntaxError || e instanceof LibraryLoadingError) {
				console.warn("Rendering an error caught while attempting to load a library file.")
				error = e
				my_library = new Library()
			}
			else {
				throw e
			}
		}

		// Generate collapsibles HTML
		my_library.generate_HTML( document.getElementById("collapsibles_root"), document.getElementById("editing-pane"), import_export_enabled)
		if (error != null) { // Display the error.
			let error_lines = error.message.split("\n")
			
			let error_line_span = document.createElement("span")
			error_line_span.textContent = "Encountered an error while attempting to parse the library file."
			
			my_library.library_loading_error_label.appendChild(error_line_span)
			my_library.library_loading_error_label.appendChild(document.createElement("hr"))
			
			for (let i = 0; i < error_lines.length; i++) {
				let error_line_span = document.createElement("span")
				error_line_span.textContent = error_lines[i]
				
				if (i > 0) my_library.library_loading_error_label.appendChild(document.createElement("br"))
				my_library.library_loading_error_label.appendChild(error_line_span)
			}
			
			my_library.library_loading_error_label.style.display = "block"
		}
		else {
			console.assert(my_library.root_q != null)
			update_progress_bars()
		}
		
		active_question = null
		quiz_score = 0
	}
	
	reader.readAsText(file)
}

function load_progress_event(e) {
	const file = e.target.files[0]; // Get the first selected file
	e.target.value = ""
	if (!file) return
	
	// File object is now available for further processing
	console.log("Loading Progress '", file.name + "', (" + file.size + " Bytes, " + file.type + ")");
	
	const reader = new FileReader();
	reader.onload = async (e) => {
		try {
			await my_library.load_save_string(reader.result)
		}
		catch (e) {
			if (e instanceof DOMException) {
				let error_line_span = document.createElement("span")
				error_line_span.textContent = "Encountered an error while attempting to parse the save file."
				my_library.library_loading_error_label.appendChild(error_line_span)
				my_library.library_loading_error_label.style.display = "block"
			}
			else {
				throw e
			}
		}
	}
	
	reader.readAsText(file)
}

async function save_progress_event() {
	function sanitize_filename(fn) {
		return fn.replace(/[<>:"/\\|?*]+/g, '_').replace(/[\x00-\x1F]+/g, '').replace(/\.$/, '')
	}
	
	const save_string = await my_library.get_save_string()
	const blob = new Blob([save_string], {type: "text/plain"});
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = sanitize_filename(my_library.title.toString()) + "-progress.json.b64"
	
	document.body.appendChild(a); // Append to the body temporarily
	a.click();
	document.body.removeChild(a); // Remove the element after clicking
	URL.revokeObjectURL(url); // Release the object URL
}

// A library serves as an explicit root to a QuestionGroup tree, wrapping its children and questions.
class Library {
	static token_map = new Map([["**", "b"], ["*", "i"], ["__", "u"], ["`", "code"]])
	
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
		this.descendants_share_incorrect_answers = false
		this.case_sensitive = false
		this.mode_of_presentation = "verbatim"
		this.max_choices = 4
		this.typo_forgiveness_level = "low"
		this.correct_answer_source = "random"
		
		this.num_explicit_incorrect_answers = 0
		this.num_offered_incorrect_answers = 0
		
		// Added to the calculation for all adaptive weights. Prevents the adaptive weight of a question from dropping too low when there are few questions.
		this.ADAPTIVE_WEIGHT_ADDEND = 0.03
		
		// Used during HTML regeneration.
		this.doc_parent = null
		this.editing_pane = null
		this.currently_editing = false
		
		// Used to display errors caught while attempting to load a library.
		this.library_loading_error_label = null
		
		if (library_data) { this.initialize(library_data) }
	}
	
	// Produces HTML corresponding to this library, which allows the selection of question groups or,
	// if "editing" is true, allows the modification of the underlying structure.
	// Deletes all existing children of the passed elements before adding new content.
	// If an editing pane is supplied, and currently_editing is true, then editing options will be displayed.
	// If currently_editing is false, however, the user will merely be shown a button that allows editing and the editing pane will be hidden until they click it.
	// If editing_pane is null, currently_editing is ignored. A button to edit is not generated.
	// If include_import_export is false, don't render buttons for importing and exporting the library. Users will still be able to save and load progress.
	generate_HTML(doc_parent, editing_pane = null, currently_editing = false, include_import_export = true) {
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
		this.include_import_export = include_import_export
		
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
		
		if (include_import_export) {
			var import_button = document.createElement("button")
			import_button.setAttribute("class", "library-header-control")
			import_button.textContent = "Import"
			import_button.addEventListener("click", () => import_file_selector.click())
			
			if (this.root_q != null) {
				var export_button = document.createElement("button")
				export_button.setAttribute("class", "library-header-control")
				export_button.textContent = "Export"
			}
		}
		
		if (this.root_q != null) {
			if (editing_pane != null) {
				var editing_controls_toggle = document.createElement("button")
				editing_controls_toggle.setAttribute("class", "library-header-control")
				editing_controls_toggle.textContent = currently_editing ? "Disable Editing" : "Enable Editing"
				editing_controls_toggle.addEventListener("click",
					currently_editing ? () => this.remove_editing_controls() : () => {this.generate_editing_controls()}
				)
			}
		}
		
		this.library_loading_error_label = document.createElement("p")
		this.library_loading_error_label.style.display = "none"
		this.library_loading_error_label.setAttribute("class", "library-loading-errpr")
		
		if (include_import_export) {
			library_header.appendChild(import_button)
			library_header.appendChild(import_file_selector)
			
			if (this.root_q != null) {
				library_header.appendChild(export_button)
			}
		}
			
		if (this.root_q != null && editing_pane != null) {
			library_header.appendChild(editing_controls_toggle)
		}
		
		library_header.appendChild(this.library_loading_error_label)
			
		doc_parent.appendChild(library_header)
		
		/* ---- Generate Body ---- */
		if (this.root_q) { this.root_q.generate_HTML(doc_parent, editing_pane, currently_editing) }
		
		if (this.root_q) {
			var library_footer = document.createElement("div")
			library_footer.setAttribute("class", "library-footer")
			
			// Create save/load buttons and another invisible file selector.
			// This is the only thing the user will see if the library is empty.
			var load_progress_selector = document.createElement("input")
			load_progress_selector.setAttribute("type", "file")
			load_progress_selector.setAttribute("id", "progress-upload")
			load_progress_selector.style.display = "none"
			load_progress_selector.addEventListener("change", load_progress_event)
			
			var load_progress_button = document.createElement("button")
			load_progress_button.setAttribute("class", "library-footer-control")
			load_progress_button.textContent = "Load Progress"
			load_progress_button.addEventListener("click", () => load_progress_selector.click())
			
			var save_progress_button = document.createElement("button")
			save_progress_button.setAttribute("class", "library-footer-control")
			save_progress_button.textContent = "Save Progress"
			save_progress_button.addEventListener("click", save_progress_event)
		}
		
		if (this.root_q) {
			library_footer.appendChild(save_progress_button)
			library_footer.appendChild(load_progress_selector)
			library_footer.appendChild(load_progress_button)
			
			doc_parent.appendChild(library_footer)
		}
	}
	
	regenerate_HTML() {
		if (!this.doc_parent) throw new Error("Cannot regenerate HTML, HTML has not yet been generated.")
		this.generate_HTML(this.doc_parent, this.editing_pane, this.currently_editing, this.include_import_export)
	
		this.root_q.reset_expansion()
		this.root_q.check_elem.checked = this.root_q.get_enabled()
		this.root_q.reset_all_descendents()
	}
	
	// Returns an object representing the current state of the learner's progress.
	// can be saved as JSON and loaded at a later time.
	get_progress_object() {
		return root_q.get_progress_object()
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
	
	deactivate_all() {
		this.root_q.deactivate_all()
	}
	
	cache_weights(am_adaptive, am_windowed) {
		this.root_q.cache_weights(am_adaptive, am_windowed)
	}
	
	debug_groups() {
		this.root_q.debug_groups()
	}
	
	debug_questions() {
		this.root_q.debug_questions()
	}
	
	get_random(am_adaptive, am_windowed, last_asked) {
		return this.root_q.get_random(am_adaptive, am_windowed, last_asked)
	}
	
	activate_question(am_ordered, am_adaptive) {
		return this.root_q.activate_question(am_ordered, am_adaptive)
	}
	
	reset_was_asked_last() {
		this.root_q.reset_was_asked_last()
	}
	
	reset_progress() {
		this.root_q.reset_progress()
	}
	
	async get_id() {
		const encoder = new TextEncoder()
		const data = encoder.encode(this.author + "-" + this.title)
		const hash_buffer = await crypto.subtle.digest("SHA-1", data)
		const byte_array = new Uint8Array(hash_buffer)
		const hash_hex = Array.from(byte_array)
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('')
		
		return hash_hex
	}
	
	// Returns a promise for an object which can be converted to JSON and which represents the mastery level of the questions in this library,
	async get_progress_object() {
		return {"id": await this.get_id(), "root": await this.root_q.get_progress_object()}
	}
	
	// Returns a promise which, upon its resolution, will have restored the progress state from the passed object which would have been generated by a call to get_progress_object()
	// TODO: The object should be validated before calling root_q.load_progress_object() in order ot avoid the library being left in an invalid state.
	async load_progress_object(obj) {
		if (!("id" in obj) || obj["id"] != await this.get_id())
			throw new Error("Cannot load progress object with missing or invalid id.")
		
		if (!("root" in obj) || typeof obj["root"] != "object")
			throw new Error("Cannot load progress object with missing or invalid root.")
		
		return await this.root_q.load_progress_object(obj["root"])
	}
	
	// Gets the progress object and converts it to base64-encoded JSON.
	async get_save_string() {
		return btoa(JSON.stringify(await this.get_progress_object()))
	}
	
	// Converts base-64 encoded JSON to an object and passes it to load_progress_object()
	async load_save_string(save_str) {
		await this.load_progress_object(JSON.parse(atob(save_str)))
	}
	
	get_num_enabled_questions() {
		return this.root_q.enabled_weight
	}
	
	get_difficulty() {
		return this.root_q.difficulty
	}
	
	get_weight(am_adaptive, am_windowed) {
		return this.root_q.get_weight(am_adaptive, am_windowed)
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
		
		console.log(`Initializing Library... Adaptation Rate: ${this.ADAPTATION_RATE.toString()}, Starting Mastery: ${this.STARTING_MASTERY.toString()}, Adaptive Weight Bias: ${this.ADAPTIVE_WEIGHT_BIAS.toString()}, Ideal Overall Difficulty: ${this.IDEAL_OVERALL_DIFFICULTY.toString()}`)
		
		let root_qg_data = library_data["question-root"]
		if (!root_qg_data) throw new Error("While interpreting Library; required parameter 'question-root' is missing")
		
		this.root_q = new QuestionGroup(root_qg_data, this.title ? this.title : "All Questions", this)
		this.root_q.recalc_available_incorrect_answers()
		this.root_q.cache_weights()
	}
}
