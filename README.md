# Web-Quiz

This project pulls its base of code from Learn-Japanese, which is a simple client-side JavaScript application that quizzes you on Hiragana and Katakana.
I'd like for this project to grow into a platform for creating, using, and sharing simmple flash-card like quizzes.

## Question Organization

Questions are organized into a hierarchical fashion to allow a user to select which categories of questions they want to see. Such a hierarchy is called a "Library" and may be encoded into a JSON file and loaded.

## Tracked Statistics

Questions have an associated "Mastery Level", which is the system's estimation of the probability that the user will correctly answer the question if it were presented again. The mastery level is calculated as the weighted average of the current mastery level and 1 or 0 depending on whether the user answered correctly or incorrectly.

The statistics can be used to make a quiz responsive. Questions with a higher mastery level can be given a lower weight for random question choice, therefore ensuring that the user is made to focus on more difficult questions and makes continuous progress. This is called adaptivity. A question's adaptive weight refers to its weight for the purpose of randomly choosing a question while adaptivity is enabled.

Another helpful technique is question windowing, which causes only a fraction of the enabled questions to be available. This makes the quiz easier and allows the user to learn many questions at once without being overwhelmed. Using a combination of the mastery levels and applicable question weights, the system estimates the probability that the user will correctly answer the next question. If this probability gets too high, additional questions are added to the window to make it harder, keeping the quiz at an approximately constant difficulty.

## Question Presentation

Questions may be presented in many ways:

### Flash Card Questions

The user does not have the opportunity to provide the answer but may reveal it at any time. The system will not have the opportunity to record user competency. However, if the user previously mastered questions while answering multiple choice or verbatim, flash cards

### Verbatim Questions

The user must type the answer verbatim.

Verbatim questions must be typeable. Verbatim questions may have case-sensitivity. Verbatim questions may reject answers which are not valid integers or floating-point numbers. After submitting an answer, the correct answer is revealed and the user is informed whether their answer was correct. An internal structure tracks the user's mastery of each question. The tracked statistics can be used to preferably selected questions that a user is less likely to answer correctly (called adaptivity) and to hide questions until the user has mastered the available questions (called windowing).

### Multiple Choice Questions

The user is asked a question and presented with multiple possible answers which can be selected, only one of which is correct. As with "verbatim" questions, an internal data structure can be updated to reflect the result.

Multiple Choice questions have the unique problem of needing to generate incorrect answers to display. To facilitate this, a question or question group may have an attached incorrect answer generator. A generator may chose from one of the following sources:
- The answers to other enabled questions in the same group which the generator is attached to.
- A predefined string or a random choice from a set of strings.
- An int or float from a range.
- An ordered set of generators whose outputs are concatenated or a random choice from a set of ordered sets of generators.

When a question is shown in multiple choice mode, the generator to be used will 
