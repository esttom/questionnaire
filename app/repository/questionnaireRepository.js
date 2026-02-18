/**
 * @interface
 */
export class QuestionnaireRepository {
  /** @param {string} _userId @returns {Promise<import('../domain/formModels.js').FormDefinition[]>} */
  async getForms(_userId) {}

  /** @param {string} _userId @param {string} _formId */
  async getForm(_userId, _formId) {}

  /** @param {string} _formId */
  async getPublicForm(_formId) {}

  /** @param {string} _userId @param {import('../domain/formModels.js').FormDefinition} _form */
  async saveForm(_userId, _form) {}

  /** @param {string} _formId @param {Record<string, string|string[]>} _response */
  async submitResponse(_formId, _response) {}

  /** @param {string} _userId @param {string} _formId */
  async getResponses(_userId, _formId) {}
}
