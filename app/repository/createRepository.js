import { InMemoryQuestionnaireRepository } from './inMemoryQuestionnaireRepository.js';

const seedForm = {
  id: 'demo-form',
  title: '製品アンケート',
  description: '新機能の満足度を教えてください。',
  questions: [
    {
      id: 'q1',
      title: '今回の新機能にどの程度満足しましたか？',
      required: true,
      type: 'singleChoice',
      options: [
        { id: 'q1o1', label: 'とても満足' },
        { id: 'q1o2', label: '満足' },
        { id: 'q1o3', label: '普通' },
        { id: 'q1o4', label: '不満' }
      ]
    },
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
    },
    {
      id: 'q3',
      title: '改善してほしい点があれば教えてください',
      required: false,
      type: 'text'
    }
  ]
};

export function createQuestionnaireRepository() {
  // 将来的にAPI版へ差し替える場合はここを変更するだけ。
  return new InMemoryQuestionnaireRepository(seedForm);
}
