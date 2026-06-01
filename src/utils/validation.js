/**
 * 이메일 주소 형식이 유효한지 검사합니다.
 * @param {string} email 
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};