# Library Algorithms Specification

In order for the library object to be useful, it must be operated on by algorithms. These algorithms analyze the user's responses in order to inform future choices for which questions to show next, in a way that attempts to maximize the pace of rote memorization.

## Submission Evaluation

One of the most important and simple algorithms is checking whether the user's supplied answer is correct. This is a multi-step process.

### Step 1: Canonization

The user's submission and the answers must all be brought into their canonical form. This process involves the following steps:

1. Perform Unicode normalization to NFKC.
2. If the question is case-insensitive, convert all cased characters to lower case.
3. Perform all substitutions, beginning with the outermost folders, and in the order of declaration.
4. Perform Unicode normalization to NFKC again.

Of course, this transformation applies to the raw text of an answer, with any markdown stripped away. This canonization process is used on the user's submission, all `answers`, `hidden-answers`, and `typo-blacklist` entries. All values in `substitutions` also undergo normalization, except that they do not undergo steps 3 and 4 for obvious reasons. Text which is inserted via substitution is not searched or passed over again, such that runaway substitution is impossible and substitution is always completed in a single pass.

### Step 2: Comparison

A round of comparisons occurs to check the correctness of the answer in the following order:

1. The canonical submission is compared to the canonical form of all `answers` and `hidden-answers` entries. If there is an exact match, the submission is marked **correct**.
2. If `typo-forgiveness-level` is `"none"`, the user is marked **incorrect**.
3. The canonical submission is compared to the canonical form of all `rejected-typo` entries. If any match, the user is marked **incorrect**.
4. The canonical submission is checked for whether it is within the typo-forgiveness threshhold of any `answer` or  `hidden-answer`. If it is, the submission is marked correct.