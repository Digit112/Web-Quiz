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

A QuestionGroup object represents either a collection of questions OR of other QuestionGroups, never a mixture of the two. It allows a hierarchical organization of questions that gives users accessible and fine-grained control of the questions they can be asked.

**A QuestionGroup has the following properties:**

- `label`: The name of this group which will be visible to users.
- `questions` OR `groups` (never both): The children of this QuestionGroup, either a list of Question objects or QuestionnGroup objects. The two may not be mixed together.
- `incorrect-answers` (optional): A list of incorrect answers which can be used by all children in addition to their own `incorrect-answers` lists and the lists on any intermediate groups.
- `descendants-give-incorrect-answers` (optional; default `false`): If `true`, the answers to descendants of this group can appear as incorrect responses to other descendants of this group, when those other descendants are presented as multiple-choice.

**The following traits may be inherited, and only effect a QuestionGroup's descendant Questions, not the QuestionGroup itself.** They may also be specified on individual Question objects, and their meanings are clarified below.

- `case-sensitive` (optional)
- `mode-of-presentation` (optional)
- `max-choices` (optional)
- `typo-forgiveness-level` (optional)
- `correct-answer-source` (optional

### Question

A question represents the association between a *question statement* and one or more answers, which the user is expected to memorize.

**A Question has the following properties:**

- `question`: A list of question statements which the user can see. The first is the primary and the only one which the user will be asked. The other questions in the list may be shown as alternative allowable answers if the questions are inverted.
- `answers`: A list of allowable answers to this question. The first answer is considered the primary answer which will be presented to the user as a question if question inversion is enabled. If the value is not an array, the value is considered the only valid answer.
- `hidden-answers`: A string or list of strings which are considered correct, but which will not be shown to the user either in the correct answer list or as a possible correct answer in multiple-choice presentation. This is meant to account for slight spelling variations in an answer, for example, "Light-Emitting Diode" and "Light Emitting Diode"
- `incorrect-answers` (optional): A list of incorrect answers which may be displayed to the user as options in multiple-choice presentation.

**The following traits may be inherited:**

- `case-sensitive` (optional; inherits by default): Whether a response with the same text but wrong letter casing counts as correct. By default, inherits from the parent QuestionGroup. If inheriting is impossible (because all ancestors also inherit), defaults to `false`.
- `mode-of-presentation` (optional; inherits by default): Whether this question requires a `verbatim` response from the user, or a `multiple-choice` selection. By default, inherits from the parent QuestionGroup. If inheriting is impossible (because all ancestors also inherit), defaults to `verbatim`.
- `max-choices` (optional; inherits by default): How many options should be shown to the user by default in `multiple-choice` presentation. Fewer options may be displayed if an insufficient number of incorrect answers can be found by the system. By default, inherits from the parent QuestionGroup. If inheriting is impossible (because all ancestors also inherit), defaults to `4`.
- `typo-forgiveness-level` (optional; inherits by default): The level of typo forgiveness, with higher levels being more likely to grade an answer correct despite small errors including insertions, deletions, and substitutions. Must be one of `"none"`, `"low"`, `"medium"`, or `"high"`. If inheriting is impossible (because all ancestors also inherit), defaults to `low`. See [link](#typo-forgiveness) for details on this.
- `correct-answer-source` (optional; inherits by default): Where to obtain the correct response to a question which will be shown to the user in multiple-choice mode. If `"random"`, chooses a random (non-hidden) answer. If `"primary"`, always uses the primary (first) answer. If inheriting is impossible (because all ancestors also inherit), defaults to `random`. Naturally, this makes no difference unless a questions has multiple answers.

### QuestionList

A QuestionList can take the form of an array of Question objects. In this case, the Questions are said to be in explicit form. Alternatively, a QuestionList can take the form of an object with key/value pairs. The key is taken to be the primary question statement. If the value is a string or array of strings, it is taken to be the primary answer or list of answers respectively. In this case, the Question is said to be in implicit form. If the value is an object, it is presumed to be a valid Question object (although the required `question` parameter may be omitted in this case, since it is provided by the key). Such a construct is said to be in embedded-explicit form.

**The following constructs all constitute equivalent definitions of a QuestionList containing a single Question:**

Explicit:
`[{"question": "q", "answer": "a"}]`

Embedded-Explicit:
`{"q": {"answer": "a"}}`

Implicit:
`{"q": "a"}`

**The following constructs both represent equivalent definitions of a QuestionList containing two questions. Note that the second question cannot be written in implicit form because it contains multiple question statements:**

Explicit:
```
[{"question": "q1", "answer": "a1"},
 {"question": ["q2", "q22"], "answer": ["a2", "a22"]}]
```

Implicit and Embedded-Explicit:
`{"q1": "a1", "q2": {"question": ["q22"], "answer": ["a2", "a22"]}}`

### QuestionGroupList

A QuestionGroupList may take the form of an array of explicit QuestionGroups or it may take the form of an object. In the latter case, the keys are taken to be the QuestionGroup label which will be shown to the user and the values will be either a valid QuestionGroup object (and therefore it will be in embedded-explicit form) or it may be a QuestionGroupList or QuestionList. In either case the listed objects are taken to be the child group's children. In that case, the group is in implicit form.

### QuestionGroupProgress:

A QuestionGroupProgress always takes the form of a QuestionGroupProgressList or a QuestionProgressList, mirroing the implicit form of QuestionGroups.

### QuestionProgress 

A QuestionGroupProgress always appears within a QuestionProgressList and corresponds to some Question object in a corresponding QuestionList.

A QuestionGroupProgress has the following properties:

- `mastery-level`: The mastery level of the question in progress.
- `num_attempts`: The number of times this question has been attempted

### QuestionProgressList

A list of QuestionProgress objects.

### QuesstionGroupProgressList

A list of QuestionGroupProgress objects

## Localization

Support for localization is on the TODO list.

## Simple vs. Complex Libraries

Simple libraries hide the tree structure from users and authors and enable all Questions in the library by default. It is meant to ease a user's introduction to the platform, internally there is no significant difference between the two kinds of libraries and they can be easily interconverted. Converting between complex and simple makes no modifications to the library, except to flip a boolean attribute in its save file. However, after converting from complex to simple, any questions which were added while it was in simple mode will have been dumped into a QuestionGroup called "Simple" which is a child of the root. Presumably, the author will want to go through the process of organizing these into groups.

## Library Authorship Best Practices

Their are a few core principle which inform the development of this platform, and which should inform the writing of each library as well.

1. Facilitate Engagement

	From a UX standpoint, this means building questions and answers which are not antogonistic, and minimizing the odds that the users feels like the questions are "unfair". The library's answers should be correct and fairly obvious for verbatim questions. If the question is multiple choice, they should be the *only* correct choice. The questions should not have multiple interpretations. Questions should account for multiple ways of spelling their correct answer *in addition* to utilizing typo forgiveness. In a nutshell, don't make the questions frustrating.

2. Rapid-Fire Response

	It's vital that you don't eat up all of the user's goodwill because all of it is consumed by the learning process itself... Learning is hard and frustrating. The faster you learn, the more frustrating it is. For the users with the greatest anger management skills, the system allows the user to answer as fast as possible. For example, there is no delay between when the user answers and when the next question appears. Certainly there isn't any animation that plays. The user can also submit with the enter key and select multiple-choice answers by typing them or by using the arrow keys, specifically so that they don't have to move their hand between the mouse and keyboard. Not only does this speed up the process of learning, it also allows the system to gather more information in less time, and this information is used to refine the experience for the user.
	
	Make sure your verbatim answers are short and simple, preferably a single word. Specify alternative spellings or synonyms where possible so that the user doesn't need to worry about whether to answer in American or British english or whether to use a hyphen or space between two words. If you can't follow these guidelines for certain questions, consider making them multiple-choice.

3. Customizability

	In general, the platform intends to enable users to shape their experience. This is done by making as few assumptions as possible about the user's needs. However, this can give the platform a steep learning curve. To balance customizability with usability, sensible defaults are employed. Most people probably just want a deck of flash cards, so a flash-card feature is employed. Under the hood, it's the same thing. The only difference is that most of the normal editing options are hidden. When the user wants more nuance, it is freely available to them.
	
	For a library author, all you really need is to organize your libraries effectively. A user may well only care about some of the questions, try to categorize them in the most useful way. Even if you're just making a deck of cards, users can still view the full structure of the library by default. If you make that structure meaningful, some might find it helpful.
	
4. Rote Memorization

	This is not university. This is a platform for rapidly memorizing large numbers of associations between questions and answers. Sometimes, this might be all that a user needs. Other times it may be a mere supplement, for example a user might memorize thousands of nouns and verbs using this platform, but they can't learn a language with it. Understanding this limitation is vital. Users should be directed to use this platform and its libraries in parallel with more comprehensive resources such as textbooks and instruction.

### Double-Check Questions

If nothing else, the questions in your library *have to be correct!* Double-check that the answers are correct by searching and, if possible, conferring with others who have the relevant knowledge. Even a subject-matter expert can make mistakes. Ideally, questions should be completely and utterly correct. The question should not have multiple interpretations, and the intended interpretation should not have multiple answers (unless those multiple answers are all accounted for!) A question's answer should be objective, and should not depend of external assumptions or context. Questions are discouraged from asking for the "best" answer, as these questions are usually rife with varying interpretations and subjective answers. The best way to check for these issues is to show the questions to someone else and ask them for the answer. If they start explaining their interpretations and listing off answers, then you've got some rewriting to do!

### Consistency

In all facets of writing, consistency is key. Many unwritten rules can guide a user in correctly providing the answer to a verbatim question. For example, it is better for an answer to be "Hub" and "Switch" rather than "A Hub" and "A Switch", but both are much better than "Hub" and "A Switch". A user wants to spend their mental effort memorizing the correct answers, not the nuances of the particular ways in which the author *phrased* the answers! Consistency also helps greatly in the ever-vital aesthetic quality of a library. Consistency in capitalization, punctuation, and phrasing all serve to ease the experience of interacting with a Library. It is not unusual for an author to write a question of the form "What is ...?" or the form "A ... is?", but mixing them together can make the experience of a Library more jagged and, more importantly, the user may end up memorizing the answers based on the *phrasing* of the questions rather than their content!

### UX & Testing

The best Library allows a user to answer very rapidly. Answers are typed and the user presses enter, the next question appears instantly. The user can even type to select an answer to a multiple-choice question so they don't have to intermittently grab the mouse. A user does not want to spend significant time typing long answers to questions they have mastered or don't want to master. The system will do its best to prevent this, but an author must do their part too: Keep answers concise, group them appropriately, and set the correct presentation style! To ensure the best experience, an author should periodically review their Library while making changes.

But most importantly of all, test! Review the questions, ensure they are consistent and make sense, check to confirm that the answers are correct and that there are no correct answers which would be graded as incorrect (this is especially important for verbatim questions). Use the test yourself, and get feedback from others if possible.

### Be Unambigous

Users do not see the names of the groups which contain a question, they only see the question! Although it may seem redundant to specify the exact same context at the beginning of every question statement in a large group, it is necessary to make sure that the user is always aware of that context when the question gets asked. Users may mix together questions from many different contexts.

### Use Hidden Answers

The `hidden-answers` field allows you to specify acceptable answers which will not be displayed to the user but which are marked correct when entered, and is meant to be used to specify alternative or non-canonical spellings for the correct answer. Again, users don't want to memorize the exact nuances of your orthography in order to get a good grade! Use this field to specify acceptable spellings *even if typo forgiveness would normally make that accommodation!* For example, the answer "Light-Emitting Diode" has 20 characters and therefore affords a user one typo at the default forgiveness level of `"low"`. This allows the user to type "Light Emitting Diode" and still be marked correct because the use of a space instead of a hyphen counts as one typo. However, if the user answers that way every single time, then they have effectively eliminated their typo forgiveness.

The typo forgiveness feature checks a user's submission against all answers and hidden answers. By utilizing the `hidden-answers` field, you afford the user maximum leeway in answering the question.

### Account For Multiple Correct Answers

When a question has more than one correct answer, you have a few options.

1. Make the question more specific
	
	This is the obvious choice. It's often possible to add more qualifiers to a question until only one answer is strictly correct. Keep in mind though, that the user may memorize the association between only one of the qualifiers with the correct answer, if no other questions in the library have that same qualifier.

2. Set the question's `mode-of-presentation` to `"multiple-choice"`

	This is a great way to ensure that the user doesn't have to read a lengthy question and doesn't feel cheated when a technically correct submission gets marked wrong. It also makes the questions easier, and some questions simply don't lend themselves well to multiple-choice (for example, questions asking what an acronym stands for)

3. Allow multiple correct answers
	
	This is a valid approach as well. The user will see all acceptable answers after submitting their response. However, the user may only memorize one of the correct answers.

Methods 2 and 3 work very well in conjunction. If there are multiple answers on a question, by default, a random one will be chosen as the single correct answer which the user will have to select to be marked correct in multiple-choice presentation. This will require that they learn both correct answers to consistently get that question correct.

Note that in this case, the question remains a single question and the user's progress is tracked as such. The system will not recognize a situation in which, for example, the user has only mastered one of two or more answers. If it is vital that a user spend as much effort on the individual answers as they would on any other question, the questions should be split into multiple questions with identical question statements but different answers. The user's progress on each question will be tracked separately.

### Use Markdown

Markdown is valid in `answers`, `incorrect-answers`, `question`, and `label` strings. This supports bold (\*\*), italics (\*), and code (\`). Use it to emphasize the portion of a question which a user should focus on.

### Question Groups

Question Groups allow a hierarchical organization of questions for a reason: to allow the user of a Library to choose the level of granularity of their control over questions. Or put another way, a user can quiz themselves on an entire library with one click, or only on very specific components with some more clicks. This allows the user to avoid questions they don't care about or have already mastered. A chunk of questions should be divided if there is a reasonable suspicion that a user might not want to select all of them at once. There is not really a practical limit on the depth that a quiz should go to. So, use QuestionGroups!

### Other Tips

- QuestionGroups can either contain Questions or other QuestionGroups, without mixing. When displayed, QuestionGroups with groups for children are collapsible, and this is signified by a square "+" button on their left. I try to keep these groups above the others as they tend to be the more important ones, but this does not always make sense in terms of the library's organization.

- `hidden-answers` entries will never be shown as *either* the correct or incorrect option on a multiple choice question. You can use it to hide inconveniant values that would otherwise appear. Mainly, you can use it to hide values which are arguably correct or incorrect depending on your interpretation of the question.

- For better or for worse, the interpreter ignores unrecognized values in the JSON. Feel free to add `"comment"` keys with TODO items or design choice explanations to guide continuing work on the library.

## Incorrect Answer Generation

Incorrect answers can be specified on a question or its ancestors, or can be received from the correct answers to sibling or cousin questions.

A Group can be queried for the number of available incorrect answers it has. A kind of group called a claimant accepts answers donated by its descendant questions. An answer can only be claimed by a single claimant, which is always the nearest ancestor that has the `descendants-give-incorrect-answers` property set to `true`. These can only appear as incorrect answers to descendants of the claimant, so a claimant should really be thought of as a partition. Answers flow freely within the subtree at a claimant's root, but can never enter or exit through that root.

Incorrect answers can also come from the `incorrect-answers` property of a question or any of its ancestors. The entries in `incorrect-answers` on the root can appear on any question in the library, and claimants do not effect this. The two systems are completely separate.

There is no concept of statistical weight assigned to incorrect answers which would cause some to appear more often than others, HOWEVER, duplicates WILL have a higher chance of appearing as incorrect answers since they count as distinct incorrect answers logically. Don't worry, before displaying them, the system does a sanity check to remove duplicate answers and, of course, to ensure that none of the "incorrect" answers would be graded as correct had they been entered verbatim.

## Typo Forgiveness

Typo Forgiveness checks whether the Levenshtein distance from the user's answer to the actual correct answer is less than or equal to some threshold. If so, the answer is marked correct despite errors. This algorithm is generally polynomial, but by imposing a maximum limit on the distance, we ensure that the time complexity is linear so long as that maximum is a (preferably small) constant.

The threshold is a linear equation in the length of the correct answer which the user's submission is being compared against, rounded to the nearest integer and capped at 6. The equation is n/5 for `"high"` forgiveness, n/10 for `"medium"`, and n/15 for `"low"` forgiveness. The threshold represents a quantity of insertions, deletions, and substitutions. Note that the common typo of swapping two characters counts as two typos (either one character has to be deleted and re-inserted, or they both must be substituted).

- `"high"` forgiveness will forgive a single typo in answers no shorter than three characters ("cat" to "bat" or "catt") and will reach the limit of 6 typos for answers of length 28. If a question's verbatim answer is "catching", this level would grade "caching", "scratching" and "bathing" as correct.
- `"medium"` forgiveness will forgive a single typo in answers no shorter than five characters ("plate" to "slate" or "late") and will reach the limit of 6 typos for answers of length 55. If a question's verbatim answer is "internationally", this level would grade "international", "intrenationally" and "uintdrnationally" as correct, but not "intrenatoinally" or "intternattionaly".
- `"low"` forgiveness is the default, and will forgive a single typo in answers no shorter than eight characters ("discover" to "discovery" or "dissover") and will reach the limit of 6 typos for answers of length 83.

### The `"auto"` typo-forgiveness setting.

While not yet implemented, it is theoretically possible for the typo level to be automatically generated by going over all pairs of questions to determine how lenient the system can be before two answers for different questions fall within a threshold of one another. This would be an immensely expensive operation. For every combination of answers and hidden answers for every question, the ordered pair consisting of the length of the longer answer and the Levenshtein distance between them give the coordinates of a data point. The linear equation giving the acceptable error threshold as a function of length is bounded above by all such data points. This function, incorporated into a piecewise function which bounds it above and below, forms the final equation used to set the acceptable degree of typo forgiveness. Formally:

Considering the set `A` of all answers and hidden answers to all questions, for each pair of answers in `{{a,b} | a ∈ A, b ∈ A, a ≠ b}`, the ordered pair `(max(|a|, |b|), (lev(a, b)-1)/2)` (where `|s|` is the length of string `s` and `lev(a, b)` is the Levenshtein distance between strings `a` and `b`) represents an upper bound on the linear function `t(n)` which takes the length of a string and returns the (real-valued) maximum Levenshtein distance between strings of length `n` which should be marked as correct. The subtraction by one ensures that neither answer could be misinterpreted as a typo of the other. The division by two ensures that no possible string is within the threshold for multiple questions, thus preventing a user from successfully answering a question by entering a typo while attempting to provide an incorrect answer. For example, `lev("bath", "cab") = 3`, thus the limit is `2` without the division, thus an entry of "bab" would be marked correct regardless of the question asked. With the division by 2, the limit becomes `1`, and no such answer is within that threshold of both strings.

The optimal choice of y-intercept and slope for `t(n)` is a question of great complexity. The simplest answer which would likely produce passable results is to hold the y-intercept at zero and chose the greatest possible slope. Another possible method is to obtain the slope from a linear regression and shift the line down as little as possible, but the most effective solution would be to ditch the linear equation altogether and adopt a piecewise function of linear equations.

Note also that in reality, comparing all answers to all other answers is not strictly necessary since there is no point in comparing answers to the same question to each other. Also, answers which are equal to each other need not be counted. Still, the operation is O(n^2) in the number of questions, which could be quite large. The calculation must be performed either by all clients upon loading the quiz, or it must be performed and cached by the server, which would likely recalculate the values internally upon receiving a PUT or PATCH request to its API.

NOTE: Preliminary tests of the current typo forgiveness Levenshtein algorithm show that a typical comparison will take 22us or so. Basic assumptions about a quiz's construction suggest that comparison of all pairs of questions in a 200-question quiz would take several seconds, and for a 1000-question quiz would take well over a minute.

## A Note on Implicit QuestionGroup child type deduction.

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

## Wishlist

### Must-Have

- Display progress & errors while loading JSON
- Pass button
- Notification of correct answer with typos
- Progress Export & Import
- Implement hidden groups
	- Auto-hide empty groups
- Fix type-to-select underlines.
	- Requires tagging support in MarkDown.js
- API serves quizzes
- **Editing Support**
	- Query Params control editing availability
	- QuestionGroup export
	- Advanced QuestionGroup Editing features

### Should-Have

- Warn the user about case-sensitive questions.
- Presentation type negotiation (between Library and User Preferences)
- Arrow-key multiple-choice selection.
- Dark mode.
- Localization Support

### Could-Have

- Ability to specify totally separate question sets depending on a group's negotiated mode of presentation.
- Warnings for unrecognized values in JSON.
- Question Inversion
- "Put the pieces in order" question type.
- "Select all that apply" question type.
- `"auto"` setting for typo forgiveness.