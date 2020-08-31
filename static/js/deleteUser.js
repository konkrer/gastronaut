'use strict';

//
// Listen for user deleting account out and call logoutGoogle.
//
$('#delete-user-form').submit(function (e) {
  Base_Obj.logoutGoogle(e, $(this), Base_Obj);
});
