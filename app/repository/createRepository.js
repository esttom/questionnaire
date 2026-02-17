import { InMemoryQuestionnaireRepository } from './inMemoryQuestionnaireRepository.js';

const seedForm = {
  id: 'demo-form',
  title: '製品アンケート',
  description: '新機能の満足度を教えてください。',
  questions: [
    {
      id: 'q2',
      title: 'よかったポイントを選んでください',
      required: false,
      type: 'multiChoice',
      options: [
        { id: 'q2o1', label: '操作性' },
        { id: 'q2o2', label: '表示速度' },
        { id: 'q2o3', label: 'デザイン' }
      ]
    }
  ]
};

export function createQuestionnaireRepository() {
  // 将来的にAPI版へ差し替える場合はここを変更するだけ。
  return new InMemoryQuestionnaireRepository(seedForm);
}
