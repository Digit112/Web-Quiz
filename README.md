# Web-Quiz

This project pulls its base of code from Learn-Japanese, which is a simple client-side JavaScript application that quizzes you on Hiragana and Katakana.
I'd like for this project to grow into a platform for creating, using, and sharing simmple flash-card like quizzes.

## Question Organization

Questions are organized into a hierarchical fashion to allow a user to select which categories of questions they want to see. Such a hierarchy is called a "Library" and may be encoded into a JSON file and loaded.

## Question Presentation

Questions may be presented in many ways:

### Asked Questions

The user must type the answer verbatim.

Asked questions do not need to generate incorrect answers but must be typeable. Asked questions may be 

### Flash Card Questions

The user does not have the opportunity to provide the answer but may reveal it at any time.

### Multiple Choice

The user is asked a question and presented with multiple possible answers which can be selected, only one of which is correct.

Multiple Choice questions have the unique problem of needing to generate incorrect answers to display. To facilitate this, a question or question group may have an attached incorrect answer generator. A generator may chose from one of the following sources:
- The answers to other enabled questions in the same group which the generator is attached to.
- A predefined string or a random choice from a set of strings.
- An int or float from a range.
- An ordered set of generators whose outputs are concatenated or a random choice from a set of ordered sets of generators.

When a question is shown in multiple choice mode, the generator to be used will 
