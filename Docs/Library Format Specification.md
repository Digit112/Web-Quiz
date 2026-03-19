# Library Format Specification 2.0

A library is a hierarchical arragement of questions-answer pairs, including a great deal of ancillary data such as tagging, ordering, and presentation information which governs the behavior of the library interface and many algorithms which operate on the library data structure.

## Purpose of this Specification

The specification provides a complete list of object types and their relations to one another, including the data held by them which is named and typed. This specification does not dictate the use of the structure or the nature of algorithms which might operate on the structure. It does not dictate a particular method for saving or loading the data.

This specification defines a JSON dialect. This specification clarifies the intended interpretation of the data held, and explains these design decisions in the context of the structure as an input for a set of algorithms (a tool) that enables fast-paced rote memorization.

## List of Objects

See the below list of object specifications which are types. The primitive types are *string*, *integer*, *float*, *bool*.
The special primitive *mdstring* supports `**` for bold, `*` for italics, <code>\`</code> for code, `~` for strikethrough, and `_` for underline. All such tokens can be escaped with backslash `\`

Arrays of types are specified as *string[]*, *integer[]*, etc. If a field may have multiple types, they will be listed with a `|` between them.

Maps from one type to another are effectively objects whose keys are not know ahead of time, and are specified as *string{}* where *string* is the type of the values. A dictionary of strings onto integers would be *integer{}* (the keys are always strings!0

### Library

#### Keys

- `title` (*string*; required) - The display name of the library.
- `description` (*mdstring[]*; default []) - A list of text blurbs. Each is its own paragraph, displayed to the user.
- `author` (*string*; required) - The UUID of the author. If it is not a valid UUID or the specified UUID is not a known account, displayed as-is to the user.
- `version` (*integer*; required) - Must be 2.
- `root` (*Folder* | *QuestionSet*; required) - The root of the hierarchy. If it is a question set, the whole library is colloquially called a "Set", "Quiz", or "Deck" depending on its internals.

### Folder

A folder is a container which may have other Folders or QuestionSets within it.

A folder has its own params as well as passthru params that only affect the behavior of questions beneath the folder.

#### Keys

- `label` (*mdstring*; required) - The name of this folder. Displayed to the user.
- `contents` (*(QuestionSet | Folder)[]*; required) - The contents of this folder.
- `incorrect-answers` (*mdstring[]*; default []) - A set of incorrect answers which may appear on all questions contained by this folder, when they are shown in multiple choice.
- `hidden` (*bool*; default false) - If true, this folder will not be shown to the user. Allows you to make folders that serve strictly structural purposes. If a folder is hidden, all of its children will be hidden too.
- `substitutions` (*string\{\}*; default \{\}) A map of literal find-and-replace strings to be applied to submissions and answers before being compared. Useful to remove typographic nuances such as the differences between British and American English, or to replace all hyphens with spaces so that users don't need to remember how to hyphenate a phrase to be marked correctly. If the question is also case-insensitive, the case canonization should be applied before the substitutions.

#### Passthru Keys

These parameters do not affect the behavior of the folder at all, instead being inherited by - and affecting only - the questions within the folder. Their definitions are provided on the Question object definition.

- `case-sensitive`
- `mode-of-presentation`
- `max-choices`
- `typo-forgiveness-level`
- `correct-answer-source`
- `incorrect-answer-sources`