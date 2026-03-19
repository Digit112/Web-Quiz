# Library Style Guide

This guide covers the nuances and edge-cases around quiz authorship. If followed, it allows quizzes by distinct authors to have a consistent look and feel.

## Questions

### Sentence case questions

Questions should be cased like normal sentences and use punctuation as well as correct grammar.

### Bold the unique parts of a question

When two or more questions differ only by a few words, bold the unique parts to make it easier for the user to distinguish them. Note that placing emphasis on a question (with bold or italics) directs the user to what they should be memorizing.

```
"Biometric Efficacy": {
	"In biometrics, what metric measures the number of **valid** subjects who are **denied** access?": ["False Rejection Rate", "FRR"],
	"In biometrics, what metric measures the number of **invalid** subjects who are **approved** access?": ["False Acceptance Rate", "FAR"]
}
```

## Answers

### Title Case Answers

All answers should be in Title Case. Simpler words like articles ('the', 'a', and 'an') as well as most prepositions ('with', 'at') can be exempted.

### Suggested Answer Last

The answer which the user should prefer to type in verbatim mode (usually the shortest, especially acronyms) should be placed last. This frames it as an alternative to the first answer, which is perhaps the most correct but also the most verbose. For example:
```
"What sort of switch allows an administrator to configure it, often via HTTP or SSH?": [
	"Managed Switch", "Managed"
]
```

Here, "Managed Switch" is the most proper answer, but typing it all out every time is really a waste. The user should just be able to type the "Managed" part, which is the most important.

## Acronyms

### Always Include Acronyms Spelled-Out

It's easier to remember an acronym answer if you know what it stands for! It's also easy to forget what an acronym stands for after typing it a hundren times in an hour like an automaton. Give the user a chance to refresh their memory by looking at the "Correct answers included" field after answering the question.

### Acronym Answers Go Last

As per the "Suggested Answers Last" rule, acronyms should always go last in the answers list.

```
"What kind of network uses geographically distributed servers and caching to deliver data with minimal latency?": [
	"Content Delivery Network", "CDN"
]
```