<?php

namespace app\controllers;

use app\common\CommonConst;
use app\common\faceApi\FaceRequest;
use app\models\collections\ActiveUsers;
use app\models\FaceRecognitionTransaction;
use app\models\FaceVerification;
use app\models\login\LoginLog;
use app\models\Unit;
use app\models\User;
use app\models\UserLoginFaceAuthenticationImage;
use Exception;
use Yii;
use yii\helpers\ArrayHelper;
use yii\helpers\Url;
use yii\web\Controller;
use yii\web\NotFoundHttpException;
use yii\web\Response;
use yii\web\ServerErrorHttpException;

/**
 * Class FaceRecognitionController
 */
class FaceRecognitionController extends Controller
{
    /**
     * 受講前の顔認証：(ajax)カメラから取得した写真を保存するアクション
     * @return array|string
     * @throws Exception
     */
    public function actionAddFace()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $api = new FaceRequest();
        if (Yii::$app->request->post()) {
            $image = Yii::$app->request->post('image');
            $displayType = Yii::$app->request->post('displayType');
            $unitType = Yii::$app->session->get('faceRecognitionUnitType', null);
            $result = $api->addFaceProcess($image);
            $faceImageFile = ArrayHelper::remove($result, 'file');
            if ($displayType == CommonConst::LOGIN_DISPLAY) {
                FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::LOGIN_TYPE);
                $this->saveFaceVerifyLoginLog($faceImageFile);
            } elseif ($displayType == CommonConst::LIVE_DISPLAY) {
                FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::LIVE_TYPE);
            } else {
                switch ($unitType) {
                    case Unit::UNIT_TEST:
                        FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::TEST_TYPE);
                        break;
                    case Unit::UNIT_LECTURE:
                        FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::LECTURE_TYPE);
                        break;
                }
            }
            return $result;
        } else {
            throw new Exception('POSTリクエストが見つかりません');
        }
    }

    /**
     * 受講前の顔認証：(ajax)顔認証するアクション
     * @return array|string
     * @throws Exception
     */
    public function actionVerifyFace()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        // セッション切れ等で両方存在しないケースの対応
        if (!Yii::$app->session->has('faceVerificationUserPersonId') && !isset(Yii::$app->user->identity->face_person_id)) {
            return ['code' => 'NoneSession'];
        }
        $api = new FaceRequest();
        $options = [];
        if (Yii::$app->request->post()) {
            $image = Yii::$app->request->post('image');
            $displayType = Yii::$app->request->post('displayType');
            $unitId = Yii::$app->session->get('faceRecognitionUnitId', null);
            $ullId = Yii::$app->session->get('faceRecognitionUserLearningLessonId', null);
            $unitType = Yii::$app->session->get('faceRecognitionUnitType', null);
            if ($unitId && $ullId) {
                $options = [
                    'ullId' => $ullId,
                    'unitId' => $unitId,
                    'unitType' => $unitType,
                ];
            }
            Yii::$app->db->enableSlaves = false;
            $preserve = $displayType == CommonConst::LOGIN_DISPLAY;
            $result = $api->verifyFaceProcess($image, $options, $preserve);
            $faceImageFile = ArrayHelper::remove($result, 'file');
            if ($displayType == CommonConst::LOGIN_DISPLAY) {
                FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::LOGIN_TYPE);
                $this->saveFaceVerifyLoginLog($faceImageFile);
            } elseif ($displayType == CommonConst::LIVE_DISPLAY) {
                FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::LIVE_TYPE);
            } else {
                switch ($unitType) {
                    case Unit::UNIT_TEST:
                        FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::TEST_TYPE);
                        break;
                    case Unit::UNIT_LECTURE:
                        FaceRecognitionTransaction::countUp(FaceRecognitionTransaction::LECTURE_TYPE);
                        break;
                }
            }

            if (isset($result['confirm']) && $result['confirm']) {
                if ($displayType == CommonConst::LESSON_DISPLAY) {
                    Yii::$app->session->set('isFaceRecognized', true);
                }
                Yii::$app->session->remove('faceRecognitionUserLearningLessonId');
                Yii::$app->session->remove('faceRecognitionUnitId');
                Yii::$app->session->remove('faceRecognitionUnitType');
                Yii::$app->session->remove('displayType');
                Yii::$app->session->remove('faceRecognitionLiveId');
            }
            return $result;
        } else {
            throw new Exception('POSTリクエストが見つかりません');
        }
    }

    /**
     * 顔認証ログイン履歴の保存
     * @param string $faceImageFile 顔画像ファイル名
     */
    private function saveFaceVerifyLoginLog($faceImageFile)
    {
        // レプリケーション遅延対策
        Yii::$app->db->useMaster(function () use ($faceImageFile) {
            $loginLogId = Yii::$app->session->get('faceVerificationLoginLogId');
            if ($loginLogId) {
                $loginLog = LoginLog::findOne($loginLogId);
            } else {
                $loginLog = new LoginLog(
                    Yii::$app->session->get('faceVerificationLoginId'),
                    Yii::$app->session->get('faceVerificationUserId'),
                    ActiveUsers::withinAccessTime()->count()
                );
                // この時点でのログは顔認証失敗で作成しておく。成功時は後続のログイン処理で最終的に成功に書き換わる。
                $loginLog->saveFailureDetectLog();
            }

            $loginLog->face_authentication_count += 1;
            if (!$loginLog->save()) {
                throw new ServerErrorHttpException('LoginLog save error.');
            }

            if ($faceImageFile) {
                $imageLog = $loginLog->userLoginFaceAuthenticationImage;
                if (!$imageLog) {
                    $imageLog = new UserLoginFaceAuthenticationImage();
                    $imageLog->user_login_log_id = $loginLog->id;
                }
                $imageLog->img_file_name = $faceImageFile;
                if (!$imageLog->save()) {
                    throw new ServerErrorHttpException('LoginImage save error.');
                }
            }

            Yii::$app->session->set('faceVerificationLoginLogId', $loginLog->id);
        });
    }

    /**
     * 再設定の認証コードを生成し、メール送信するアクション
     * @return Response
     * @throws NotFoundHttpException
     */
    public function actionSendCodeForUpdateFace(): Response
    {
        $displayType = Yii::$app->session->get('displayType', null);
        switch ($displayType) {
            case CommonConst::LOGIN_DISPLAY:
                $userId = Yii::$app->session->get('faceVerificationUserId', null);
                break;
            case CommonConst::LESSON_DISPLAY:
            case CommonConst::LIVE_DISPLAY:
                $userId = Yii::$app->user->identity->id;
                break;
            default:
                throw new NotFoundHttpException;
        }
        if (!$userId) {
            throw new NotFoundHttpException();
        }
        FaceVerification::deleteAll(['user_id' => $userId]);
        $model = FaceVerification::issueCode($userId);
        $model->sendMail();
        return $this->redirect(Url::to(['reset-face-verification']));
    }

    /**
     * 顔認証の再設定機能
     * @return string|Response
     * @throws NotFoundHttpException
     */
    public function actionResetFaceVerification()
    {
        $this->layout = 'login';
        $displayType = Yii::$app->session->get('displayType', null);
        switch ($displayType) {
            case CommonConst::LOGIN_DISPLAY:
                $userId = Yii::$app->session->get('faceVerificationUserId', null);
                break;
            case CommonConst::LESSON_DISPLAY:
            case CommonConst::LIVE_DISPLAY:
                $userId = Yii::$app->user->identity->id;
                break;
            default:
                throw new NotFoundHttpException;
        }
        $resetFace = FaceVerification::findOne([
            'user_id' => $userId,
            'is_success' => FaceVerification::NOT_VALIDATE,
        ]);

        if (empty($resetFace)) {
            return $this->redirect('/');
        }

        $post = Yii::$app->request->post('FaceVerification', []);
        if ($post) {
            $inputVerificationCode = $post['verification_code'];

            $validateResult = $resetFace->validateCode($inputVerificationCode);

            if ($validateResult == FaceVerification::VALIDATE_SUCCESS){                $user = User::findOne($userId);
                $faceApi = new FaceRequest();
                $faceApi->deletePerson($faceApi->convertTenantUniqueId(), $user->face_person_id);
                $user->face_person_id = '';
                $user->face_verify_img_file_name = '';
                $user->save(false);
                $displayType = Yii::$app->session->get('displayType');
                if (Yii::$app->session->has('faceVerificationLoginImage')){
                    Yii::$app->session->remove('faceVerificationLoginImage');
                }
                if (Yii::$app->session->has('faceVerificationUserPersonId')) {
                    Yii::$app->session->remove('faceVerificationUserPersonId');
                }
                switch ($displayType) {
                    case CommonConst::LOGIN_DISPLAY:
                        return $this->redirect('/login/face-verification');
                    case CommonConst::LESSON_DISPLAY:
                        return $this->redirect('/lesson/face-verification');
                    case CommonConst::LIVE_DISPLAY:
                        $liveId = Yii::$app->session->get('faceRecognitionLiveId', null);
                        return $this->redirect('/live/face-verification?id=' . $liveId);
                    default:
                        throw new NotFoundHttpException;
                }
            }
            if ($validateResult == FaceVerification::VALIDATE_TOO_MANY_WRONG) {
                return $this->redirect('/');
            }
        }

        return $this->render('@app/common/view/faceRecognize/reset-face-verification', ['model' => $resetFace]);
    }
}
