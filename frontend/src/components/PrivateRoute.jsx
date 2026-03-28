function PrivateRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <p className="private-message">Please log in to access this page.</p>;
  }

  return children;
}

export default PrivateRoute;
