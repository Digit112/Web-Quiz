# Web-Quiz

This project pulls its base of code from Learn-Japanese, which is a simple client-side JavaScript application that quizzes you on Hiragana and Katakana.
I'd like for this project to grow into a platform for creating, using, and sharing simmple flash-card like quizzes.

Questions consist of a question component, that is, a string to be presented to the user, and one or more answer strings. Any answer string constitutes a correct response to a quesiton. Questions may be inverted, with answers presented to the user who is expected to provide the question. To preserve the symmetry in this case, there may be multiple questions to an answer, and one question is called the primary question while one answers is called the primary answer.

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

## Library Save Format

Libraries are saved as plain JSON. The root node is a Library object.

#### A Library has the following properties:
- `version`: Should always be `1`.
- `adaptation-rate` (optional; default 0.15): The amount that the mastery level of a question changes to reflect recent answers to a given question. A higher value makes the mastery level more responsive to user progress, but reduces its accuracy as a measure of user comprehension. Ranges from 0 to 1. Note that the mastery level is used to control windowing.
- `starting-mastery` (optional; default 0.5): The starting mastery level of new questions which the user has not answered. Ranges from 0 - 1.
- `adaptive-weight-bias` (optional; default 5): The degree to which unmastered questions are preferred over mastered ones during random question generation with adaptivity enabled. Ranges from 1 to infinity, with 1 being equivalent to having no adaptivity at all. Totally unmastered questions are ADAPTIVE_WEIGHT_BIAS times more likely to be chosen than totally mastered questions.
- `ideal-overall-difficulty` (optional; default 0.3): The difficulty that the system will attempt to keep the quiz at, ranges from 0 to 1. The value is the fraction of the time that the user should answer incorrectly. If the system estimates that the user will answer correctly too often, it will add additional questions to the question window to increase difficulty. At 0, the system will never add questions to the window because the quiz will never be easy enough to satisfy the system. Note that switching from adaptive to uniform quesiton generation reduces the probability of difficult questions being chosen and therefore causes the difficulty to drop significantly. As a result, the system might decide to add many questions to the window at once. Questions will not be removed from the window unless the user clicks "reset progress".
- `question-root`: The root QuestionGroup object. This is the root of a tree whose leaves are Question objects. The tree forms the hierarchy which facilitates the efficient grouping of questions. When presented to the user, the groups whose children are not leaf nodes will appear as expandable/collapsible nodes. If one is selected, all of its children will automatically be enabled as well.
- `progress-root` (optional): The root QuestionGroupProgress object. This tree stores variables which track the user's mastery over individual questions. Its structure must precisely match the structure of the tree rooted at `question-root`.

#### A QuestionGroup has the following properties:

- `label`: The name of this group which will be visible to users.
- `questions` OR `groups` (never both): The children of this QuestionGroup, either a list of Question objects or QuestionnGroup objects. The two may not be mixed together.
- `incorrect-answer-source` (optional): An IncorrectAnswerGenerator object which allows the generation of the incorrect choices in multiple-choice mode. Most often it uses the `other-question` source to retrieve the wrong answers from other questions descending from the group which has the generator. If a question and it's parent do not have a generator, it's parent's parent is checked, and so on potentiaally all the way to the root node. If the root is not assigned an IncorrectAnswerGenerator, it is default-assigned a generator with only the `other-question` source.

#### A Question has the following properties:

- `question`: A list of questions. The first is the primary and the only one which the user will be asked. The other questions in the list may be shown as alternative allowable answers if the questions are inverted.
- `answer`: A list of allowable answers to this question. The first answer is considered the primary answer which will be presented to the user as a question if question inversion is enabled.
- `case-sensitive` (optional; default `false`): Whether a response with the same text but wrong letter casing counts as correct.

#### A QuestionGroupProgress has the following properties:

- `label`: The label of the corresponding QuestionGroup in the questions tree.

- `questions` OR `groups` (never both): The children of this node, either a list of QuestionProgress objects or QuestionnGroupProgress objects. The two may not be mixed together.

#### A QuestionProgress has the following properties:

- `label`: The label 