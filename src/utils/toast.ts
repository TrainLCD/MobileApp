import Toast, { type ToastShowParams } from 'react-native-toast-message';

export const TOAST_HIDE_DURATION = 300;

export const showToast = (params: ToastShowParams) => {
  Toast.hide();
  setTimeout(() => Toast.show(params), TOAST_HIDE_DURATION);
};
