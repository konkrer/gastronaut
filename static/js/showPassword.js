'use strict';

class ShowPassword {
  constructor() {
    this.$passInput = $('#password');
    this.addToggleShowPasswordListener();
  }

  addToggleShowPasswordListener() {
    $('#toggle-show-password').click(
      function () {
        if (this.$passInput.prop('type') === 'password')
          this.$passInput.prop('type', 'text');
        else this.$passInput.prop('type', 'password');
      }.bind(this)
    );
  }
}

const ShowPasswordObj = new ShowPassword();
