interface JwtPayload {
  [key: string]: string;
}

export function jwtDecode(token: string) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

  const payload: JwtPayload = JSON.parse(jsonPayload);

  return {
    userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
    username: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
    displayName: payload['displayName'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
  };
}
