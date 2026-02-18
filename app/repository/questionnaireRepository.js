/**
 * @interface
 */
export class QuestionnaireRepository {
  /** @returns {Promise<import('../domain/formModels.js').FormDefinition[]>} */
  async getForms() {}

  /** @param {string} _formId */
  async getForm(_formId) {}

  /** @param {import('../domain/formModels.js').FormDefinition} _form */
  async saveForm(_form) {}

  /** @param {string} _formId @param {Record<string, string|string[]>} _response */
  async submitResponse(_formId, _response) {}

  /** @param {string} _formId */
  async getResponses(_formId) {}
}
