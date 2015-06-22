import {EventEmitter} from 'events';
import AppDispatcher from '../dispatchers/AppDispatcher.js';
import AppConstants from '../constants/AppConstants.js';
import DecisionStore from './DecisionStore.js';
import ChoiceStore from './ChoiceStore.js';

class AnswerStore extends EventEmitter {
    constructor() {
        super();
        this.decisions = {};
    }

    emitChange() {
        this.emit('CHANGE');
    }

    addChangeListener(cb) {
        this.on('CHANGE', cb);
    }

    removeChangeListener(cb) {
        this.removeListener('CHANGE', cb);
    }

    dump() {
        return this.decisions;
    }

    getAnswer(decision_id) {
        return this.decisions[decision_id].answer
    }

    getAnswerStatus(decision_id) {
        return this.decisions[decision_id].status;
    }

    _addAnswerByDecision(decision) {
        var status = (decision.choices.length > 0) ? AppConstants.ANSWER.EXISTS : AppConstants.ANSWER.IMPOSSIBLE;

        this.decisions[decision.id] = {
            status: status,
            choiceCount: decision.choices.length,
            answer: decision.answer
        };
    }

    _removeAnswerByDecision(id) {
        if (this.decisions.hasOwnProperty(id)) {
            delete this.decisions[id];
        }
    }

    _choiceAdded(decision_id) {
        var decision = this.decisions[decision_id];
        decision.choiceCount++;
        decision.status = AppConstants.ANSWER.POSSIBLE;
    }

    _choiceUpdated(decision_id) {
        this.decisions[decision_id].status = AppConstants.ANSWER.POSSIBLE;
    }

    _choiceRemoved(decision_id) {
        var decision = this.decisions[decision_id];
        decision.choiceCount--;
        decision.status = (decision.choiceCount > 0) ? AppConstants.ANSWER.POSSIBLE : AppConstants.ANSWER.IMPOSSIBLE;
    }

    _setAnswer(decision_id, answer = null) {
        var decision = this.decisions[decision_id];
        if (answer) {
            decision.answer = answer;
            decision.status = AppConstants.ANSWER.EXISTS;
        } else {
            decision.status = (decision.choiceCount > 0) ? AppConstants.ANSWER.POSSIBLE : AppConstants.ANSWER.IMPOSSIBLE;
        }
    }
}

let _AnswerStore = new AnswerStore();
export default _AnswerStore;

_AnswerStore.dispatchToken = AppDispatcher.register((payload) => {
    AppDispatcher.waitFor([
        DecisionStore.dispatchToken,
        ChoiceStore.dispatchToken
    ]);

    switch (payload.type) {
        case AppConstants.ANSWER.NEW:
            _AnswerStore._setAnswer(payload.decision_id, payload.answer);
            _AnswerStore.emitChange();
            break;
        case AppConstants.ANSWER.REMOVE:
            _AnswerStore._setAnswer(payload.decision_id, null);
            _AnswerStore.emitChange();
            break;
        case AppConstants.DECISION.RECEIVE_MULTIPLE:
            _.map(payload.decisions, (decision) => {
                _AnswerStore._addAnswerByDecision(decision);
            });
            _AnswerStore.emitChange();
            break;
        case AppConstants.DECISION.ADD:
            _AnswerStore._addAnswerByDecision(payload.decision);
            _AnswerStore.emitChange();
            break;
        case AppConstants.DECISION.REMOVE:
            _AnswerStore._removeAnswerByDecision(payload.id);
            _AnswerStore.emitChange();
            break;
        case AppConstants.CHOICE.ADD:
            _AnswerStore._choiceAdded(payload.choice.decision_id);
            _AnswerStore.emitChange();
            break;
        case AppConstants.CHOICE.UPDATE:
            _AnswerStore._choiceUpdated(payload.choice.decision_id);
            _AnswerStore.emitChange();
            break;
        case AppConstants.CHOICE.REMOVE:
            _AnswerStore._choiceRemoved(payload.decision_id);
            _AnswerStore.emitChange();
            break;
    }
});