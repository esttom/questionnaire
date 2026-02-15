import { createQuestionnaireRepository } from './repository/createRepository.js';
import { FormService } from './usecases/formService.js';
import { renderApp } from './ui/renderApp.js';

const repository = createQuestionnaireRepository();
const service = new FormService(repository);

renderApp(service);
