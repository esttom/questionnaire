/** @typedef {'singleChoice'|'multiChoice'|'text'} QuestionType */

/**
 * @typedef {{ id: string, label: string }} QuestionOption
 * @typedef {{ id: string, title: string, required: boolean, type: QuestionType, options?: QuestionOption[] }} Question
 * @typedef {{ id: string, ownerId: string, title: string, description: string, status: 'draft'|'published', questions: Question[] }} FormDefinition
 */
