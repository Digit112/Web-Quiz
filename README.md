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

Multiple Choice questions have the unique problem of needing to generate incorrect answers to display. To facilitate this, Questions and QuestionGroups have the `incorrect-answers` property, which allows explicitly specifying a list of wrong answers to be displayed for a question or for all descendants of a QuestionGroup. In addition, QuestionGroups have the property `descendants-give-incorrect-answers`, allowing the descendants of a QuestionGroup to use the correct answers of other descendants as incorrect answers to their own questions. This last option is enabled by default and is the simplest method.

Whenever a question is displayed in multiple-choice presentation, a sufficient number of incorrect answers are drawn from all available sources.

## Library Save Format

Libraries are saved as plain JSON. The root node is a Library object.

### Library

The Library object is the root JSON object. It has the following properties:

- `version`: Should always be `1`.
- `adaptation-rate` (optional; default 0.15): The amount that the mastery level of a question changes to reflect recent answers to a given question. A higher value makes the mastery level more responsive to user progress, but reduces its accuracy as a measure of user comprehension. Ranges from 0 to 1. Note that the mastery level is used to control windowing.
- `starting-mastery` (optional; default 0.5): The starting mastery level of new questions which the user has not answered. Ranges from 0 - 1.
- `adaptive-weight-bias` (optional; default 4.5): The degree to which unmastered questions are preferred over mastered ones during random question generation with adaptivity enabled. Ranges from 1 to infinity, with 1 being equivalent to having no adaptivity at all. Totally unmastered questions are ADAPTIVE_WEIGHT_BIAS times more likely to be chosen than totally mastered questions.
- `ideal-overall-difficulty` (optional; default 0.3): The difficulty that the system will attempt to keep the quiz at, ranges from 0 to 1. The value is the fraction of the time that the user should answer incorrectly. If the system estimates that the user will answer correctly too often, it will add additional questions to the question window to increase difficulty. At 0, the system will never add questions to the window because the quiz will never be easy enough to satisfy the system. Note that switching from adaptive to uniform quesiton generation reduces the probability of difficult questions being chosen and therefore causes the difficulty to drop significantly. As a result, the system might decide to add many questions to the window at once. Questions will not be removed from the window unless the user clicks "reset progress".
- `question-root`: The root QuestionGroup object. This is the root of a tree whose leaves are Question objects. The tree forms the hierarchy which facilitates the efficient grouping of questions. When presented to the user, the groups whose children are not leaf nodes will appear as expandable/collapsible nodes. If one is selected, all of its children will automatically be enabled as well.
- `progress-root` (optional): The root QuestionGroupProgress object. This tree stores variables which track the user's mastery over individual questions. Its structure must precisely match the structure of the tree rooted at `question-root`.

### QuestionGroup

A QuestionGroup object represents either a collection of questions OR of other QuestionGroups.

A QuestionGroup has the following properties:

- `label`: The name of this group which will be visible to users.
- `questions` OR `groups` (never both): The children of this QuestionGroup, either a list of Question objects or QuestionnGroup objects. The two may not be mixed together.
- `descendants-give-incorrect-answers` (optional; default `true`): If true, the answers to descendants of this group can appear as incorrect responses to other descendants of this group, when those other descendants are presented as multiple-choice.
- `incorrect-answers` (optional): A list of incorrect answers which can be used by all children in addition to their own `incorrect-answers` lists and the lists on any intermediate groups.

- `case-sensitive` (optional): Specify on a group to allow its descendants to inherit the value. May be overidden by descendants.
- `mode-of-presentation` (optional): Specify on a group to allow its descendants to inherit the value. May be overidden by descendants.
- `max-choice-options` (optional): Specify on a group to allow its descendants to inherit the value. May be overidden by descendants.

### A Question has the following properties:

- `question`: A list of question statetments which the user can see. The first is the primary and the only one which the user will be asked. The other questions in the list may be shown as alternative allowable answers if the questions are inverted.
- `answer`: A list of allowable answers to this question. The first answer is considered the primary answer which will be presented to the user as a question if question inversion is enabled. If the value is not an array, the value is considered the only valid answer.
- `hidden-answer`: A string or list of strings which are considered correct, but which will not be shown to the user either in the correct answer list or as a possible correct answer in multiple-choice presentation. This is meant to account for slight spelling variations in an answer, for example, "Light-Emitting Diode" and "Light Emitting Diode"
- `incorrect-answers` (optional): A list of incorrect answers which may be displayed to the user as options in multiple-choice presentation.
- `case-sensitive` (optional; inherits by default): Whether a response with the same text but wrong letter casing counts as correct. By default, inherits from the parent QuestionGroup. If inheriting is impossible (because all ancestors also inherit), defaults to `false`.
- `mode-of-presentation` (optional; inherits by default): Whether this question requires a `verbatim` response from the user, or a `multiple-choice` selection. By default, inherits from the parent QuestionGroup. If inheriting is impossible (because all ancestors also inherit), defaults to `verbatim`.
- `max-choice-options` (optional; inherits by default): How many options should be shown to the user by default in `multiple-choice` presentation. Fewer options may be displayed if an insufficient number of incorrect answers can be found by the system. By default, inherits from the parent QuestionGroup. If inheriting is impossible (because all ancestors also inherit), defaults to `4`.

### Common parameters for both Groups and Questions

The following pertain to Question presentation. If a Question lacks these parameters, they can be inherited from its ancestors.

### QuestionList

A QuestionList can take the form of an array of Question objects. In this case, the Questions are said to be in explicit form. Alternatively, a QuestionList can take the form of an object with key/value pairs. The key is taken to be the primary question statement. If the value is a string or array of strings, it is taken to be the primary answer or list of answers respectively. In this case, the Question is said to be in implicit form. If the value is an object, it is presumed to be a valid Question object (although the required `question` parameter may be omitted in this case, since it is provided by the key). Such a construct is said to be in embedded-explicit form.

**The following constructs all constitute equivalent definitions of a QuestionList containing a single Question:**

Explicit:
`[{"question": "q", "answer": "a"}]`

Embedded-Explicit:
`{"q": {"answer": "a"}}`

Implicit:
`{"q": "a"}`

**The following constructs both represent equivalent definitions of a QuestionList containing two questions. Note that the second question cannot be written in implicit form because it contains multiple questrion statements:**

Explicit:
```
[{"question": "q1", "answer": "a1"},
 {"question": ["q2", "q22"], "answer": ["a2", "a22"]}]
```

Implicit and Embedded-Explicit:
`{"q1": "a1", "q2": {"question": ["q22"], "answer": ["a2", "a22"]}}`

### QuestionGroupList

A QuestionGroupList may take the form of an array of explicit QuestionGroups or it may take the form of an object. In the latter case, the keys are taken to be the QuestionGroup label which will be shown to the user and the values will be either a valid QuestionGroup object (and therefore it will be in embedded-explicit form) or it may be a QuestionGroupList or QuestionList. In either case the listed objects are taken to be the child group's children. In that case, the group is in implicit form.

#### A Note on Implicit QuestionGroup child type deduction.

When interpreting an Implicit QuestionGroup, the parser must deduce whether the entity is a QuestionList or QuestionGroupList. However, some entities (such as the one below) constitute **both** a valid Question and QuestionGroup. In fact, all valid Question objects constitute a valid QuestionGroup.

`"q": {"answer": "a"}`

While the above looks like a simple Question in embedded-explicit form, it is also a valid QuestionGroup in implicit form because the value is a valid QuestionList containing a Question in implicit form. Written as a QuestionGroup in explicit form:

```
{"label": "q", "questions": [{"question": "answer", "answer": "a"}]}
```

Or, equivalently:
```
{"label": "q", "questions": {"answer": "a"}}
```

Therefore, when interpreting an implicit QuestionGroup, which must either be a QuestionList or QuestionGroupList, if the construct is a valid QuestionList and all questions are in embedded-explicit form, **it is also a valid QuestionGroupList** because **All of the embedded-explicit Question objects are also valid implicit QuestionGroup objects**. Therefore it is ambiguous whether the outermost QuestionGroup has questions or groups for children... Of course, such constructs are always interpreted as QuestionList objects.

Therefore, if a QuestionGroup is being written in implicit form, which has QuestionGroup(s) for children, but which has no children which are not also valid Question objects, then the group itself or at least one child must be written in explicit or embedded-explicit form. Here is a minimal example:
```
{"my_label": {
	"innerkey": {"answer": "a"}
}}
```

The above is a QuestionGroup called "my_label" in implicit form. Its child may be a QuestionGroup "innerkey" which contains a single Question in implicit form, or its child may be a question in embedded-explicit form. Below are the two possible interpretations, written in fully explicit form:

Containing implicit QuestionGroup called "innerkey":
```
{
	"label": "my_label",
	"groups": {
		"label": "innerkey",
		"questions": [
			{"question": "answer", "answer": "a"}
		]
	}
}
```

Containing embedded-explicit Question with question statement "innerkey":
```
{
	"label": "my_label",
	"questions": [
		{"question": "innerkey", "answer": "a"}
	]
}
```

Note that whether the QuestionGroup "my_label" has *groups* or *questions* for children is the crux of the ambiguity. The latter interpretation is always preferred. If the former were intended, the inner QuestionGroup would have to be written in embedded-explicit form:
```
{"my_label": {
	"innerkey": {"groups": {"answer": "a"}}
}}
```

Or the question itself could be written in embedded-explicit form:
```
{"my_label": {
	"innerkey": {"answer": {"answer": "a"}}
}}
```

Put another way, a QuestionGroup whose children are all Questions with the primary question statement "answer" and who are themselves written in implicit form, must not be written in implicit form.

**The following constructs all constitute equivalent lists containing a single QuestionGroup with one question:**

Explicit QuestionGroup containing explicit Question: 
`[{"label": "group-name", "questions": [{"question": "q", "answer": "a"}]}]`

Explicit QuestionGroup containing implicit Question:
`[{"label": "group-name", "questions": {"q": "a"}}]`

Implicit QuestionGroup containing explicit Question:
`{"group-name": [{"question": "q", "answer": "a"}]}`

Implicit QuestionGroup containing Implicit Question:
`{"group-name": {"q": "a"}}`

Same as above but with an array of length one. Additional answers can be added to the array.
`{"group-name": {"q": ["a"]}}`

Unless generators or properties must be assigned to Questions and QuestionGroups, implicit mode is 

#### A QuestionGroupProgress has the following properties:

- `label`: The label of the corresponding QuestionGroup in the questions tree.

- `questions` OR `groups` (never both): The children of this node, either a list of QuestionProgress objects or QuestionnGroupProgress objects. The two may not be mixed together.

#### A QuestionProgress has the following properties:

- `label`: The label 
