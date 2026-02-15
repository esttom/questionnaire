/** @typedef {'singleChoice'|'multiChoice'|'text'} QuestionType */

/**
 * @typedef {{ id: string, label: string }} QuestionOption
 * @typedef {{ id: string, title: string, required: boolean, type: QuestionType, options?: QuestionOption[] }} Question
 * @typedef {{ id: string, title: string, description: string, questions: Question[] }} FormDefinition
 */
