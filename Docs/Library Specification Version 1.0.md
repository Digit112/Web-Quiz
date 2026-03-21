# Library Specification Version 1.0

## Scope

This specification governs the structure an attributes of a Library object, which takes the form of a JSON dialect. This specification defines the attributes and their types and meanings, which ultimately determines the set of supported features which could be implemented by an interface allowing interaction with a library object. As context for the definition, we begin with an overview of the intended use-case of library objects and supported features.

This specification DOES NOT dictate implementation details, nor shall it be construed to dictate or restrict the interfaces, algorithms, or use-cases with which the structure is deemed compatible.

## Design Philosophy and Objectives

With the above in mind, we acknowledge that design does not occur in a vacuum. This project arose from a desire to allow the rapid rote memorization of large quantities of information. The fundamental idea was not the library but actually an algorithm acting on the library which chose questions randomly with a probability inversely proportional to the user's mastery over them. The structure arose as a hierarchical organization of questions from which to choose, which developed an ever-expanding set of features in the process.

In learning, one typically prefers to focus on the abstract concepts to the exclusion of simple facts. The grammar of a language is much more interesting than lists of its nouns, and one would much rather memorize the rules of chemical interactions as implied by the structure of the periodic table as opposed to memorizing rules for each individual element. Still, you must know a language's nouns in order to speak it, and quite a few atomic interactions are far too complex to have their behavior encoded in the shape of a polyomino. Rote memorization is a necessary step of any learning process, and a powerful tool to speed up that process will be beneficial to all learners. The Library structure is a dialect of JSON which encodes questions and groups them into a hierarchical structure. It facilitates their dynamic generation and the effective modeling of their relationships to each other.

## Basic Components

A Library consists of *Folders*, *Quizzes*, *Decks*, and *Sets*. Decks and sets are both groupings of questions, but a deck (being a deck *of flash cards*) consists exclusively of flash cards. A quiz is also the same as a set, but its questions are not meant to be memorized. Instead, a quiz evaluates the user's mastery over subject matter. This impacts the choice of algorithm used to select questions. A folder is unique, it can store any combination of quizzes, decks, and sets, or other folders. This is the basis for the hierarchical organization of questions.

