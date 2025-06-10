// A library serves as an explicit root to a QuestionGroup tree, wrapping its children and questions.
class Library {
	constructor(
		library_data,
		ADAPTATION_RATE = 0.15,
		STARTING_MASTERY = 0.5,
		ADAPTIVE_WEIGHT_BIAS = 0.65,
		IDEAL_OVERALL_DIFFICULTY = 0.3
	) {
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
		this.ADAPTATION_RATE = ADAPTATION_RATE

		// The mastery level of a question which has not been answered.
		this.STARTING_MASTERY = STARTING_MASTERY

		// The "remainder" of a question is 1 minus the current mastery level.

		// The weight used for a question in adaptive mode is max(1 / my_library.ADAPTIVE_WEIGHT_BIAS ^ mastery), 1 / num_active_questions)
		// An ADAPTIVE_WEIGHT_BIAS of 1 is the same as having adaptive mode off.
		// As ADAPTIVE_WEIGHT_BIAS increases, mastered questions become increasingly rare.
		// Totally unmastered questions are ADAPTIVE_WEIGHT_BIAS times more likely to be chosen than totally mastered questions.
		this.ADAPTIVE_WEIGHT_BIAS = ADAPTIVE_WEIGHT_BIAS

		// The overall difficulty is the sum of the remainders of all available questions, each multiplied by their respective probability of being chosen.
		// Since the remainder is an approximate likelihood that the user will answer a question incorrectly,
		// overall difficulty is an approximate measure of the likelihood that the user will get the next question wrong (whatever it happens to be)
		// The question windowing attempts to keep the overall difficulty approximately constant throughout the session.
		// So, IDEAL_OVERALL_DIFFICULTY basically controls how challenging the questions are.
		this.IDEAL_OVERALL_DIFFICULTY = IDEAL_OVERALL_DIFFICULTY
		
		this.root_q = new QuestionGroup("All Questions", this, true)
		this.root_q.add_children_from_dict(library_data)
	}
	
	get_new_question_weight(am_adaptive) {
		return am_adaptive ? Math.pow(this.ADAPTIVE_WEIGHT_BIAS, this.STARTING_MASTERY / (1 - this.STARTING_MASTERY)) : 1
	}
}
