/**
 * @interface
 */
export class QuestionnaireRepository {
  /** @param {string} _formId */
  async getForm(_formId) {}

  /** @param {import('../domain/formModels.js').FormDefinition} _form */
  async saveForm(_form) {}

  /** @param {string} _formId @param {Record<string, string|string[]>} _response */
  async submitResponse(_formId, _response) {}
}
