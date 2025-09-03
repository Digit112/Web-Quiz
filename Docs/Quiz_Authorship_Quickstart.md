# Quiz Authorship Quickstart

This document is designed to teach you the basics of writing quiz files. Quiz files have advanced features that will be mentioned but not covered in this document. To learn about them, look at the "Library Save Format" specification in the readme.

These files are written in JSON syntax, and can be imported into the Web-Quiz page. The format is currently subject to change in the future.

## The Library Object

The root object is called a library, it looks like this:

```
{
	"version": 1,
	"author": "ekobadd",
	"title": "CompTIA A+ Certification 220-1101 (Core 1)",
	"question-root": ...
}
```

Only the `version` and `question-root` fields are required. This quickstart will use version 1. Additional fields allow you to tweak the default behavior of the quiz, such as how quickly it adapts to user progress or how difficult it is. These won't be covered in the quickstart, however.

## The `question-root`

The `question-root` must be a `QuestionGroup` object. QuestionGroup objects are a collection of other `QuestionGroup`s or of `Question`s, but never both. It is the root of a hierarchy of groups that the user can select or deselect.
A user cannot toggle individual questions, only QuestionGroups, so they should be used to organize questions into small blocks that the user may want to include or omit as a whole unit.
For now, however, we will merely place all our questions directly into this group.

### The Question Object

Here's an example where the `question-root` contains only three brief questions:

```
"question-root": {
	"What comes after hello?": "World",
	"What kind of object am I?": "Question",
	"What kind of object is my parent?": "QuestionGroup"
}
```

As you can see, the questions take the simple form of `"question": "answer"`. You already have enough knowledge to create a small library of some questions that require verbatim answers. By default, they are case-insensitive and even have a low level of typo forgiveness, which we'll go over later. The third question, for example, allows the user to make a single error.

If the user answers "Question Group" (with a space), then the question will be marked correct, which will influence the system's internal evaluation of their mastery over the material, and depending on the settings this information can influence what questions they see later. The user will be informed that the system has identified their answer as a correct answer with a typo.

![The space is counted as an error](quickstart-images/typod-answer.png)

Maybe this is not the behavior you like, maybe you think that "Question Group" is a *perfectly* acceptable answer and that the answer should not be thought of as typo'd. Moreover, you'd like the user to be able to give the answer with an additional typo, like "Wuestion Group", and still be marked correct. There are two ways to do this.

First, you can add "Question Group" as an additional answer, like so.

```
"What kind of object is my parent?": ["QuestionGroup", "Question Group"]
```

We've replaced the single answer with multiple answers in a list. Both answers are considered correct. After the user submits an attempt to this question, they will see both of these answers as valid options.

![The extra answer is displayed](quickstart-images/extra-answer-shown.png)

If you're thinking that you want the user to *be able to* answer "Question Group", but that it's not a canonical answer *per se*, just an alternative spelling, and you don't think it should actually be shown to the user, then you want to use second option: the `hidden-answers` field. In order to use this field or any field other than `question` and `answers`, we'll need to switch to **embedded-explicit** form.

### Question Forms

So far, we've been writing each question as a JSON key-value pair. It has been implicitly understood that the key is the question and the value is the answer or list of answers. Thus, this is called **implicit** form. The equivalent in **embedded-explicit** form is

```
"What kind of object is my parent?": {"answers": ["QuestionGroup", "Question Group"]}
```

There's also an **explicit** form, which won't be covered because it's never necessary and is mostly present as a formality.

### `hidden-answers`

As you can see in the example, the `answers` are now explicitly labeled as such inside of a container object. We can add our `hidden-answers` in next to it.

```
"What kind of object is my parent?": {
	"answers": "QuestionGroup",
	"hidden-answers": "Question Group"
}
```

Below, we see an image where a user has made a typo while attempting to type "Question Group" with a space. They are marked correct and have been informed of their typo. If we didn't add the hidden answer, this would have been marked as incorrect since it would have been marked as having two typos, which is too many for this particular question.

![The typo'd hidden answer is marked correct, the hidden answer is not shown.](quickstart-images/hidden-answer-typod.png)

Additionally, we see that the user is nonetheless only shown the one canonical answer. Also note that, just like the `answers` field, the `hidden-answers` field will also accept multiple values in a list rather than a single string.

### `typo-blacklist`

Maybe for the purposes of your library you assert that the user should *not* be able to answer "Question Group". The user ought to memorize the *correct* spelling, you say, arms folded and gaze sharp. Still, you don't want to eliminate the typo forgiveness completely. After all, typos happen, and getting marked incorrect for a mistaken keypress feels unfair.

For this purpose, we use the `typo-blacklist` field, which accepts a single entry or multiple entries in a list.

```
"What kind of object is my parent?": {
	"answers": "QuestionGroup",
	"typo-blacklist": "Question Group"
}
```

![An answer with a space is now incorrect.](quickstart-images/blacklisteed-answer.png)

### `case-sensitive` and `typo-forgiveness-level`

These are both *inheritable* fields closely related to the interpretation of a user's answer. We can't understand inheritance until we understand groups. But for now, just know that you *can* specify the `case-sensitive` or `typo-forgiveness-level` fields on individual questions, but you very rarely will in practice.

`case-sensitive` determines whether the user must match an answer's case in order to be marked correct. It is `false` by default. If it is `true`, then a letter with the wrong case will be counted as a single typo. The typo-blacklist also respects case sensitivity. If a quesiton is case-sensitive, the user will see a warning of this beneath the question text.

`typo-forgiveness-level` is complicated and covered in great depth in the readme. Just know that it counts typos using the Levenshtein algorithm, counting an insertion, deletion, or substitution of a single character as one typo. Valid values are "none", "low", "medium", and "high", where the default is "low". The exact number of typos allowed depends on the length of the answer. "low" allows a single typo for answers of length 8 and an additional typo for every 15 characters of length, "medium" allows a typo at length 5 and another typo for every 10 characters, "high" allows a typo at only 3 characters and an additional typo for every 5 additional characters.

The following question requires the user to submit "World" *exactly*, any deviation will be marked incorrect.
```
"What comes after 'Hello'?": {
	"answers": "World",
	"case-sensitive": true,
	"typo-forgiveness-level": "none"
}
```

## Multiple Choice Questions

Trying to create a large library of multiple choice questions with the syntax I'm about to introduce would be quite grueling, so don't do that! Once we've fleshed out the Question object, we can move on to the Group object. This is where the format will really open up for us.

### `mode-of-presentation`

The `mode-of-presentation` determines how the user will answer the question. The default, where the user enters the answer into a text box, is called "verbatim". The other options are "flash-card", where the user *isn't* asked for an answer, they merely reveal it, and "multiple-choice", where the user is prompted to select one of many answers.