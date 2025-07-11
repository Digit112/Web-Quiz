// Explanations for the available settings.
const random_gen_expl = "Every question has an equal chance of being picked. The same question cannot appear twice in a row."
const adapt_gen_expl = "Questions that you frequently answer incorrectly will appear more often. The same question cannot appear twice in a row."
const quiz_gen_expl = "All questions will be presented to you one at a time. When all questions have been exhausted, the process repeats. If shuffle questions is not checked, the questions will be presented in a predefined order."

const windowing_expl = "A small number of questions will be available to begin. As you master old questions, the pool of questions will increase in size. Makes no difference in quiz mode."
const no_windowing_expl = "All questions will be available immediately."

const shuffle_expl = "Questions will become available in a random order."
const no_shuffle_expl = "Questions will become available in a predefined order. Only works if the question window is enabled, otherwise all questions become available immediately."

// Get elements and add event listeners
let editing_pane = document.getElementById("editing-pane")
let gen_explanation = document.getElementById("gen_explanation")
let random_gen = document.getElementById("random_gen")
let adapt_gen = document.getElementById("adapt_gen")
let quiz_gen = document.getElementById("quiz_gen")

let use_window = document.getElementById("use_window")
let window_explanation = document.getElementById("window_explanation")
let do_shuffle = document.getElementById("do_shuffle")
let shuffle_explanation = document.getElementById("shuffle_explanation")

let reset_progress = document.getElementById("reset_progress")

let begin_button = document.getElementById("begin-button")

let verbatim_field = document.getElementById("verbatim-field")
let multiple_choice_field = document.getElementById("multiple-choice-field")
let current_mode = null

let question_text = document.getElementById("question-text")
let answer_text = document.getElementById("answer-text")
let next_question = document.getElementById("next-question")

let correct_indicator = document.getElementById("correct-indicator")
let last_question = document.getElementById("last-question")
let your_response = document.getElementById("your-response")
let correct_answer = document.getElementById("correct-answer")

let my_library = new Library()
my_library.generate_HTML(document.getElementById("collapsibles_root"), editing_pane)

let active_question = null

// Number of correctly answered questions since the last quiz cycle.
let quiz_score = 0

// These listeners are used to allow users to select multiple-choice questions by typing them.
// Allows the user to submit their selection and also use backspace.
let selecting_string_elem = null
let type_select_handler = new TypingEventHandler(document, attempt_to_apply_new_selecting_string)
document.addEventListener("keydown", (event) => {
	if (event.key == "Enter" && selecting_string_elem != null) {
		selecting_string_elem.click()
	}
})

// Removes stylings and clears the string typed via events.
function clear_typed_selection_stylings() {
	for (let child of multiple_choice_field.children) {
		child.textContent = child.textContent // Removes <span> Elements
		child.classList.remove("active");
	}
}

function attempt_to_apply_new_selecting_string(new_selecting_string) {
	new_selecting_string = new_selecting_string.toLowerCase()
	
	clear_typed_selection_stylings()
	if (new_selecting_string.length == 0) {
		selecting_string_elem = null
		return true
	}
	else {
		// The match will be highlighted (and selectable)
		// only if we find an exact match or exactly one match.
		let found_exact_match = false
		let num_matches = 0
		
		for (let child of multiple_choice_field.children) {
			// TODO: Probably better to only lowercase for case-insensitive questions.
			let child_text = child.textContent.toLowerCase()
			let text_to_match = new_selecting_string.toLowerCase()
			
			// Check for match.
			if (child_text.startsWith(text_to_match)) {
				num_matches++
				
				// Save matching child. Do not overwrite any previous exact match.
				// Value is discarded if there end up being multiple matches.
				if (!found_exact_match) {
					selecting_string_elem = child
				}
				
				// Check for exact match
				if (child_text == text_to_match) {
					found_exact_match = true
				}
				
				// Underline the matches.
				let prefix = document.createElement("span")
				prefix.style.textDecorationLine = "underline"
				
				let suffix = document.createElement("span")
				
				prefix.textContent = child.textContent.slice(0, new_selecting_string.length) // Preserve capitalization
				suffix.textContent = child.textContent.slice(new_selecting_string.length)
				child.replaceChildren(prefix, suffix)
			}
		}
		
		// Activate the canonical match, if any.
		if (num_matches == 1 || found_exact_match) {
			selecting_string_elem.classList.add("active")
		}
		else {
			selecting_string_elem = null
		}
		
		// If no match is found, type_select_handler is not updated to reflect the new keypress.
		if (num_matches > 0) {
			return true
		}
		else {
			attempt_to_apply_new_selecting_string(type_select_handler.value)
			return false
		}
	}
}

random_gen.addEventListener("input", () => {
	gen_explanation.textContent = random_gen_expl
})

adapt_gen.addEventListener("input", () => {
	gen_explanation.textContent = adapt_gen_expl
})

quiz_gen.addEventListener("input", () => {
	gen_explanation.textContent = quiz_gen_expl
	
	my_library.root_q.deactivate_all()
	my_library.root_q.cache_weights(adapt_gen.checked, use_window.checked)
	quiz_score = 0
})

use_window.addEventListener("input", () => {
	if (this.checked) {
		window_explanation.textContent = windowing_expl
	}
	else {
		window_explanation.textContent = no_windowing_expl
	}
})

do_shuffle.addEventListener("input", () => {
	if (this.checked) {
		shuffle_explanation.textContent = shuffle_expl
	}
	else {
		shuffle_explanation.textContent = no_shuffle_expl
		my_library.root_q.reset_was_asked_last()
	}
})

reset_progress.addEventListener("click", () => {
	my_library.root_q.reset_all()
})

// Secretly the same as next-question
begin_button.addEventListener("click", () => {
	if (generate_next_question()) {
		begin_button.style.display = "none"
	}
})

// Add Event Listener for the next question button.
next_question.addEventListener("click", generate_next_question)
answer_text.addEventListener("keydown", (e) => {
	if (e.key == "Enter") {
		generate_next_question()
	}
})

// Generate a new question.
function generate_next_question() {
	// Cache values to prevent them from being changed while the function is running.
	let am_adaptive = adapt_gen.checked
	let am_quiz = quiz_gen.checked
	let am_ordered = !do_shuffle.checked
	let am_windowed = use_window.checked
	
	// Always delete the character's typed selection.
	type_select_handler.attempt_set_value("")
	
	if (active_question != null) {
		// Check the answer.
		let answer = answer_text.value.trim()
		if (answer == "") return false // Do nothing if no answer provided.
		
		let correct = active_question.attempt(answer)
		if (correct) {
			correct_indicator.textContent = "Correct"
			correct_indicator.style.color = "#070"
			if (am_quiz) quiz_score++
		}
		else {
			correct_indicator.textContent = "Incorrect"
			correct_indicator.style.color = "#700"
		}
		
		last_question.replaceChildren(new MarkDown(active_question.q[0]).render())
		your_response.textContent = answer
		correct_answer.textContent = active_question.a
	}
	
	// Update weights.
	my_library.root_q.cache_weights(am_adaptive, am_windowed)
	
	if (my_library.root_q.enabled_weight == 0) {
		alert("Please select some questions from the menu.")
		return false
	}
	
	if (!am_quiz) {
		// Outside of quiz mode, consider expanding the window. This is done by activating questions until the preferred difficulty is reached.
		// This is done even if windowing is not enabled. If it gets enabled down the line, then the questions should be appropriate.
		for (let i = 0; i < 20; i++) {
			let new_question_weight = my_library.get_new_question_weight(am_adaptive)
			let new_question_probability = new_question_weight / (new_question_weight + my_library.root_q.get_weight(am_adaptive, am_windowed))
			let new_question_difficulty = 1 - my_library.STARTING_MASTERY
			
			// Calculate what the difficulty would be if we added a new question.
			let theoretical_difficulty = my_library.root_q.difficulty * (1 - new_question_probability) + new_question_difficulty * new_question_probability
			
			console.log("New question's probability of being chosen: " + (new_question_probability * 100) + "%")
			console.log("Current Difficulty: " + my_library.root_q.difficulty + ", Theoretical Difficulty: " + theoretical_difficulty)
			
			let difficulty_offset = Math.abs(my_library.IDEAL_OVERALL_DIFFICULTY - my_library.root_q.difficulty)
			let theoretical_difficulty_offset = Math.abs(my_library.IDEAL_OVERALL_DIFFICULTY - theoretical_difficulty)
			
			// If adding a question would make the quiz both harder and closer to the ideal difficulty, add it.
			if (theoretical_difficulty > my_library.root_q.difficulty && theoretical_difficulty_offset < difficulty_offset) {
			
			// Add question if doing so would increase the difficulty beyond the preferred difficulty threshold.
			// This method prevents lockup associated with the new question having extremely high probability and thus dominating the theoretical difficulty calculation, thus
			// if (my_library.root_q.difficulty < my_library.IDEAL_OVERALL_DIFFICULTY && theoretical_difficulty > my_library.IDEAL_OVERALL_DIFFICULTY) {
				if (i == 19) console.warn("Added 20 questions to the window at once. This may be a bug.")
				
				let new_question = my_library.root_q.activate_question(am_ordered, am_adaptive)
				
				// Failed to activate a question. We have activated all of them already.
				if (new_question == null) break
				
				my_library.root_q.cache_weights(am_adaptive, am_windowed)
			}
			else {
				// We have achieved ideal difficulty.
				break
			}
		}
	}
	
	// In quiz mode, question activation is used to retrieve questions.
	// This is because it has the property of getting each question in-turn, which is what we want.
	// Note that if quizzing is enabled after answering some questions, all previously activated questions will be deactivated.
	// If it is disabled mid-quiz, all quizzed questions since the last quiz cycle will suddenly be getting asked over and over again. This is a bit strange, but
	// it is really the ideal interpretation of how to handle a player swapping modes mid-test in this way.
	if (am_quiz) {
		active_question = my_library.root_q.activate_question(am_ordered, am_adaptive)
		
		if (active_question == null) { // All question activated, restart the quiz.
			my_library.root_q.deactivate_all()
			my_library.root_q.cache_weights(am_adaptive, am_windowed)
			
			if (my_library.root_q.enabled_weight > 0) {
				let quiz_grade = Math.round(quiz_score / my_library.root_q.enabled_weight * 100)
				quiz_score = 0
				
				console.log("Quiz Complete. Score is " + quiz_grade + "%.")
				correct_indicator.textContent += " - Quiz Complete! " + quiz_grade + "% correct."
			}
			
			active_question = my_library.root_q.activate_question(am_ordered, am_adaptive)
		}
		
		if (active_question == null) throw new Error("Failed to get new quiz question.")
		
		my_library.root_q.cache_weights(am_adaptive, am_windowed)
	}
	// Get the next question. If in quiz mode, we already got it.
	else {
		if (active_question != null) console.log("Last question '" + active_question.q + "' now has a remainder of " + active_question.get_remainder())
		let last_active_question = active_question
	
		// Get an active question. If no valid question exists, activate and return one.
		// TODO: This sometimes seems to fail on very small question sets. DOUBLE TODO Fixed I think???
		active_question = my_library.root_q.get_random(am_adaptive, am_windowed, active_question)
		if (active_question == null) active_question = my_library.root_q.activate_question(am_ordered, am_adaptive)
		
		if (active_question == null) {
			active_question = last_active_question
			console.warn("Reusing previous question! Is more than one question selected?")
		}
		
		if (active_question == null) throw new Error("Failed to get question in adaptive or random mode.")
	}
	
	// Reset fields
	answer_text.value = ""
	multiple_choice_field.replaceChildren()
	
	// Display the question.
	question_text.replaceChildren(new MarkDown(active_question.q[0]).render())
	
	if (active_question.mode_of_presentation == "verbatim") {
		verbatim_field.style.display = "block"
		multiple_choice_field.style.display = "none"
		
		answer_text.focus()
	}
	else if (active_question.mode_of_presentation == "multiple-choice") {
		verbatim_field.style.display = "none"
		multiple_choice_field.style.display = "flex"
		
		let available_answers = active_question.get_incorrect_answers(active_question.max_choices - 1)
		available_answers.push(active_question.get_correct_answer())
		
		if (available_answers.length == 1) {
			console.warn("No incorrect answers!")
			console.log(available_answers)
		}
		
		// Shuffle answers
		for (let i = 0; i < available_answers.length; i++) {
			let r = Math.random()
			let j = Math.floor(r * (available_answers.length - i)) + i
			
			if (i != j) {
				let temp = available_answers[i]
				available_answers[i] = available_answers[j]
				available_answers[j] = temp
			}
		}
		
		console.log(available_answers)
		
		// Generate HTML
		for (let avail_answer of available_answers) {
			let new_button = document.createElement("button")
			new_button.textContent = avail_answer
			new_button.setAttribute("class", "multiple-choice-answer")
			new_button.addEventListener("click", () => {
				answer_text.value = new_button.textContent
				generate_next_question()
			})
			
			multiple_choice_field.appendChild(new_button)
		}
	}
	else {
		throw new Error("Question has invalid mode-of-presentation '" + active_question.mode_of_presentation + "'.")
	}
	
	return true
}