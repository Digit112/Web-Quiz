// Explanations for the available settings.
const random_gen_expl = "Every question has an equal chance of being picked. The same question cannot appear twice in a row."
const adapt_gen_explanation_expl = "Questions that you frequently answer incorrectly will appear more often. The same question cannot appear twice in a row."
const quiz_gen_explanation_expl = "All questions will be presented to you one at a time. When all questions have been exhausted, the process repeats. If shuffle questions is not checked, the questions will be presented in a predefined order."

const windowing_expl = "A small number of questions will be available to begin. As you master old questions, the pool of questions will increase in size. Makes no difference in quiz mode."
const no_windowing_expl = "All questions will be available immediately."

const shuffle_expl = "Questions will become available in a random order."
const no_shuffle_expl = "Questions will become available in a predefined order. Only works if the question window is enabled, otherwise all questions become available immediately."

// Add Event Listeners to question generation options
let gen_explanation = document.getElementById("gen_explanation")
let random_gen = document.getElementById("random_gen")
let adapt_gen = document.getElementById("adapt_gen")
let quiz_gen = document.getElementById("quiz_gen")

let use_window = document.getElementById("use_window")
let window_explanation = document.getElementById("window_explanation")
let do_shuffle = document.getElementById("do_shuffle")
let shuffle_explanation = document.getElementById("shuffle_explanation")

let reset_progress = document.getElementById("reset_progress")

let question_text = document.getElementById("question_text")
let answer_text = document.getElementById("answer_text")
let next_question = document.getElementById("next_question")

let correct_indicator = document.getElementById("correct_indicator")
let last_question = document.getElementById("last_question")
let your_response = document.getElementById("your_response")
let correct_answer = document.getElementById("correct_answer")

random_gen.addEventListener("input", function() {
	gen_explanation.innerHTML = random_gen_expl
})

adapt_gen.addEventListener("input", function() {
	gen_explanation.innerHTML = adapt_gen_expl
})

quiz_gen.addEventListener("input", function() {
	gen_explanation.innerHTML = quiz_gen_expl
	
	my_library.root_q.deactivate_all()
	my_library.root_q.cache_weights(adapt_gen.checked, use_window.checked)
})

use_window.addEventListener("input", function() {
	if (this.checked) {
		window_explanation.innerHTML = windowing_expl
	}
	else {
		window_explanation.innerHTML = no_windowing_expl
	}
})

do_shuffle.addEventListener("input", function() {
	if (this.checked) {
		shuffle_explanation.innerHTML = shuffle_expl
	}
	else {
		shuffle_explanation.innerHTML = no_shuffle_expl
		my_library.root_q.reset_was_asked_last()
	}
})

reset_progress.addEventListener("click", function() {
	my_library.root_q.reset_all()
	
	window_size = 5
	my_library.root_q.reset_was_asked_last()
})

// Add Event Listener for the next question button.
next_question.addEventListener("click", generate_next_question)
answer_text.addEventListener("keydown", function(event) {
	if (event.key == "Enter") {
		generate_next_question()
	}
})

my_library = new Library(

// Generate collapsibles HTML
my_library.root_q.generate_HTML( document.getElementById("collapsibles_root") )

let last_active_question = null
let active_question = null

// Number of correctly answered questions since the last quiz cycle.
let quiz_score = 0

// Generate a new question.
function generate_next_question() {
	// Cache values to prevent them from being changed while the function is running.
	let am_adaptive = adapt_gen.checked
	let am_quiz = quiz_gen.checked
	let am_ordered = !do_shuffle.checked
	let am_windowed = use_window.checked
	
	if (active_question != null) {
		// Check the answer.
		let answer = answer_text.value.trim().toLowerCase()
		if (answer == "") {return} // Do nothing if no answer provided.
		
		let correct = active_question.attempt(answer)
		if (correct) {
			correct_indicator.innerHTML = "Correct"
			correct_indicator.style.color = "#070"
			quiz_score++
		}
		else {
			correct_indicator.innerHTML = "Incorrect"
			correct_indicator.style.color = "#700"
		}
		last_question.innerHTML = "Last Question Was: " + active_question.q
		your_response.innerHTML = "Your Response Was: " + answer
		correct_answer.innerHTML = "The Correct Answer Was: " + active_question.a
	}
	
	// Update weights.
	my_library.root_q.cache_weights(am_adaptive, am_windowed)
	
	if (my_library.root_q.enabled_weight == 0) {
		alert("Please select some questions from the menu.")
		return
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
				correct_indicator.innerHTML += " - Quiz Complete! " + quiz_grade + "% correct."
			}
			
			active_question = my_library.root_q.activate_question(am_ordered, am_adaptive)
		}
		
		if (active_question == null) throw new Error("Failed to get new quiz question.")
		
		my_library.root_q.cache_weights(am_adaptive, am_windowed)
	}
	else {
		// Outside of quiz mode, consider expanding the window. This is done by activating questions until the preferred difficulty is reached.
		// This is done even if windowing is not enabled. If it gets enabled down the line, then the questions should be appropriate.
		for (let i = 0; i < 20; i++) {
			let new_question_weight = get_new_question_weight(am_adaptive)
			let new_question_probability = new_question_weight / (new_question_weight + my_library.root_q.get_weight(am_adaptive, am_windowed))
			let new_question_difficulty = 1 - STARTING_MASTERY
			
			// Calculate what the difficulty would be if we added a new question.
			let theoretical_difficulty = my_library.root_q.difficulty * (1 - new_question_probability) + new_question_difficulty * new_question_probability
			
			console.log("New question's probability of being chosen: " + (new_question_probability * 100) + "%")
			console.log("Current Difficulty: " + my_library.root_q.difficulty + ", Theoretical Difficulty: " + theoretical_difficulty)
			
			let difficulty_offset = Math.abs(IDEAL_OVERALL_DIFFICULTY - my_library.root_q.difficulty)
			let theoretical_difficulty_offset = Math.abs(IDEAL_OVERALL_DIFFICULTY - theoretical_difficulty)
			
			// If adding a question would make the quiz both harder and closer to the ideal difficulty, add it.
			if (theoretical_difficulty > my_library.root_q.difficulty && theoretical_difficulty_offset < difficulty_offset) {
				if (i == 19) console.log("WARNING: Added 20 questions to the window at once. This is probably a bug.")
				
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
	
	// Get the next question. If in quiz mode, we already got it.
	if (!am_quiz) {
		active_question = my_library.root_q.get_random(am_adaptive, am_windowed)
		if (active_question == null) { // If no valid question exists, activate and return one.
			console.log("Failed to retreive questions.")
			active_question = my_library.root_q.activate_question(am_ordered, am_adaptive)
		}
		
		if (active_question == null) throw new Error("Failed to get question in adaptive or random mode.")
		
		if (last_active_question != null) {
			console.log(last_active_question.q + ": " + last_active_question.get_remainder())
			last_active_question.was_asked_last = false
		}
		
		last_active_question = active_question
	}
	
	question_text.innerHTML = active_question.q
	answer_text.value = ""
}