'use strict';

class FileUploadFunctions {
  constructor() {
    this.addFileUploadSizeCheck();
    this.addClearFileListener();
  }

  //
  // Limit single file upload size to 4MB
  // https://stackoverflow.com/a/17173301/11164558
  // https://stackoverflow.com/a/24608023
  //
  addFileUploadSizeCheck() {
    $('input[type="file"]').on('change', function (e) {
      const file = e.currentTarget.files[0]; // get file

      if (!file) return;

      var filesize = (file.size / 1024 / 1024).toFixed(4); // MB

      if (
        file.name != 'item' &&
        typeof file.name != 'undefined' &&
        filesize >= 4
      ) {
        alert('File is too large! 4MB max.');
        e.currentTarget.value = null;
      } else {
        // Delete Photo URL as file will be uploaded.
        $('#photo_url').val('');
        // No longer need to note a file was previously cleared.
        $('#cleared_file').val('');
      }
    });
  }

  //
  // Add clear file functionality.
  //
  addClearFileListener() {
    $('.fileClear').on(
      'click',
      function (e) {
        e.preventDefault();
        $('input[type="file"]').val('');
        $('.currFile').text('');
        // Note a file was cleared for server to remove file on record.
        $('#cleared_file').val(true);
      }.bind(this)
    );
  }
}

const FileUploadFunctionsObj = new FileUploadFunctions();
