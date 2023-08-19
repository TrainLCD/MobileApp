import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useRecoilState } from 'recoil'
import pipState from '../store/atoms/pip'
import PictureInPictureModule, {
  pipEventEmitter,
} from '../utils/native/android/pictureInPictureModule'

const useIsInPiPMode = () => {
  const [{ isInPiPMode }, setPiPState] = useRecoilState(pipState)

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return () => undefined
    }

    PictureInPictureModule.registerLifecycleEventObserver()
    const listener = pipEventEmitter.addListener(
      'onPictureInPictureModeChanged',
      ({ isInPiPMode }) => {
        console.log('onPictureInPictureModeChanged', isInPiPMode)
        setPiPState(() => ({ isInPiPMode }))
      }
    )
    return listener.remove
  }, [setPiPState])

  console.log('isInPiPMode', isInPiPMode)

  return isInPiPMode
}

export default useIsInPiPMode
