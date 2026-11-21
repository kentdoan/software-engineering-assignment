/**
 * Mục đích: Kiểm tra chuỗi địa chỉ email có đúng định dạng chuẩn cơ bản hay không.
 * Cách hoạt động: Loại bỏ khoảng trắng hai đầu và đối chiếu với biểu thức chính quy yêu cầu có phần tên, ký tự @ và tên miền hợp lệ.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Mục đích: Kiểm tra số điện thoại di động có hợp lệ theo quy chuẩn 10 chữ số tại Việt Nam hay không.
 * Cách hoạt động: Cắt khoảng trắng hai đầu và kiểm tra chuỗi bắt đầu bằng chữ số 0 theo sau bởi đúng 9 chữ số.
 */
export function validatePhoneNumber(phone: string): boolean {
  return /^0\d{9}$/.test(phone.trim());
}

/**
 * Mục đích: Kiểm tra mật khẩu có đáp ứng yêu cầu độ dài tối thiểu để bảo vệ tài khoản hay không.
 * Cách hoạt động: Xác nhận giá trị truyền vào là chuỗi ký tự và có độ dài từ 6 ký tự trở lên.
 */
export function validatePasswordStrength(password: string): boolean {
  return typeof password === 'string' && password.length >= 6;
}
