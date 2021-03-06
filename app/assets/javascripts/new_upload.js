$(function () {
  let imageCount = $(".sell-form__image").data('image_count');
  let imageList = [];
  let cropper;

  $(document).on('change', '#item_item_image_image', function () {
    const files = $.extend(true, {}, $(this).prop('files'));

    manageFiles(files);
    $(this).val("");
  });

  $(document).on('click', '#dropbox', function () {
    $("#item_item_image_image").click();
  });

  // cropper表示
  $(document).on('click', '.upload-item__container__button__edit', function () {
    console.log('edit!');
    const id = $(this).data('id');
    let canvas = $("#canvas");
    const image = $("#uploadImage-" + id).attr('src');
    console.log(canvas);
    canvas.attr('src', image);
    canvas.cropper({
      viewMode: 1,
      dragMode: "move",
      aspectRatio: 1 / 1,
      guides: false,
      center: false,
      background: false,
      autoCropArea: 0.5,
      cropBoxMovable: false,
      cropBoxResizable: false,
      minCropBoxWidth: 280,
      minCropBoxHeight: 280,
      ready: function () {
        const cropper = this.cropper;
        cropper.zoomTo(0);

        const imageData = cropper.getImageData();
        console.log(imageData);
        const minSliderZoom = imageData.width / imageData.naturalWidth;

        $("#zoomSlider").slider("option", "max", 1);
        $("#zoomSlider").slider("option", "min", minSliderZoom);
        $("#zoomSlider").slider("value", minSliderZoom);
      },
    });

    cropper = canvas.data('cropper');

    $("#croppingModal").css("display", "block");

    // cropper戻るボタン
    $(document).one('click', '.cropper__body__button__back', function () {
      $("#croppingModal").css("display", "none");
      $("#canvas").cropper("destroy");
      $("#zoomSlider").slider("value", 0);
    });

    $(document).one('click', '.cropper__body__button__enter', function () {
      const result = cropper.getCroppedCanvas({ maxWidth: 600, maxHeight: 600 });
      const croppedImage = result.toDataURL('image/jpeg');
      imageList[id] = croppedImage;
      $("#uploadImage-" + id).attr('src', croppedImage);
      $("#croppingModal").css("display", "none");
      $("#canvas").cropper("destroy");
      $("#zoomSlider").slider("value", 0);
    });
  });

  // ズームスライダー初期化
  $("#zoomSlider").slider({
    orientation: "horizontal",
    max: 1,
    min: 0,
    value: 0,
    step: 0.001,
    slide: function () {
      cropper.zoomTo($(this).slider('value'));
    }
  });

  // 削除機能
  $(document).on('click', '.upload-item__container__button__delete', function () {
    const id = $(this).data('id');

    imageList[id] = null;
    imageCount--;
    $("#uploadItem-" + id).empty();
    $("#dropbox").css("display", "block");
  });

  $(document).on('click', '.stored-item__container__button__delete', function () {
    const id = $(this).data('id');

    $.ajax({
      type: "delete",
      url: "/item_images/" + id,
      data: { id: id },
      dataType: "json",
    }).then(function () {
      imageCount--;
      $("#storedItem-" + id).empty();
      $("#dropbox").css("display", "block");
    })
  });

  // ドラッグ＆ドロップ
  $(document).on('dragover', '#dropbox', function (event) {
    event.stopPropagation();
    event.preventDefault();
  });

  $(document).on('drop', '#dropbox', function (event) {
    event.preventDefault();
    const files = event.originalEvent.dataTransfer.files;
    manageFiles(files);
  });

  //送信機能
  $(document).on('click', '#newItemSubmitButton', function (event) {
    event.preventDefault();

    $("#newItemSubmitButton").prop('disabled', true);

    $.ajaxPrefilter(function(options, originalOptions, jqXHR){
      var token;
      if (!options.crossDomain){
        token = $('meta[name="csrf-token"]').attr('content');

        if (token){
          return jqXHR.setRequestHeader('X-CSRF-Token', token);
        }
      }
    });

    let formData = new FormData();

    let images = imageList.filter(function (image) {
      return image != null;
    });

    images.map(function (image, index) {
      const blob = base64ToBlob(image);
      console.log(blob);
      formData.append(`item[item_images_attributes][${index}][image]`, blob, "blob" + index + ".jpg");
    });

    if ($("#item_sub_sub_category_id").val()) {
      formData.append("item[category_id]", $("#item_sub_sub_category_id").val());
    }
    else if ($("#item_sub_category_id").val()) {
      formData.append("item[category_id]", $("#item_sub_category_id").val());
    }
    else if ($("#item_category_id").val()) {
      formData.append("item[category_id]", $("#item_category_id").val());
    }
    else {
      formData.append("item[category_id]", "");
    }

    if ($("#item_brand_id").val()) {
      formData.append("item[brand_id]", $("#item_brand_id").val());
    }

    formData.append("item[name]", $("#nameField").val());
    formData.append("item[comment]", $("#commentField").val());
    formData.append("item[condition]", $("#item_condition").val());
    formData.append("item[shipping_fee]", $("#item_shipping_fee").val());
    formData.append("item[prefecture_id]", $("#item_prefecture_id").val());
    formData.append("item[days_to_ship]", $("#item_days_to_ship").val());
    formData.append("item[price]", $("#priceField").val());

    let type = 'POST';
    if ($("[name=_method]").length){
      type = $("[name=_method]").val();
    }
    const url = $("#itemForm").attr('action');
    $.ajax({
      type: type,
      url: url,
      data: formData,
      dataType: "json",
      processData: false,
      contentType: false,
      beforeSend: function () {
        $("#newItemSubmitButton").val("");
        $("#newItemSubmitButton").css("background-color", "#ccc");
        $("#loadIcon").css("display", "block");
      },
    }).done(function (data) {
      location.href = "/items/" + data.id;
    }).fail(function (response) {
      showError();
    }).always(function () {
      $("#newItemSubmitButton").val("出品する");
      $("#newItemSubmitButton").css("background-color", "#e62017");
      $("#loadIcon").css("display", "none");
      $("#newItemSubmitButton").prop('disabled', false);
    });
  });

  function resizeImage(base64image, size, callback) {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let image = new Image();
    // image.crossOrigin = "Anon;ymous";
    image.onload = function (event) {
      let dstWidth = 0;
      let dstHeight = 0;

      if (this.width > this.height) {
        dstWidth = size;
        dstHeight = this.height * size / this.width;
      }
      else {
        dstHeight = size;
        dstWidth = this.width * size / this.height;
      }
      canvas.width = dstWidth;
      canvas.height = dstHeight;
      console.log(canvas);
      ctx.drawImage(this, 0, 0, this.width, this.height, 0, 0, dstWidth, dstHeight);
      callback(canvas.toDataURL());
    };
    image.src = base64image;
  }

  function base64ToBlob(base64image){
    const type = "image/jpeg";
    const binary = atob(base64image.split(',')[1]);
    let buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++){
      buffer[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([buffer.buffer], { type: type });

    return blob;
  }

  function addPreviewToUploadField(image, index) {
    const html = `<div class="upload-item" id="uploadItem-${index}">
                    <div class="upload-item__container">
                      <figure><img src="${image}" class="upload-item__container__image" id="uploadImage-${index}"/></figure>
                      <div class="upload-item__container__button" id="upButton-${index}">
                        <a class="upload-item__container__button__edit" data-id="${index}">編集</a>
                        <a class="upload-item__container__button__delete" data-id="${index}">削除</a>
                      </div>
                    </div>
                  </div>`

    $("#uploadField").prepend(html);
  }

  function manageFiles(files) {
    const fileLength = files.length;
    imageCount += fileLength;

    for (let i = 0; i < fileLength; i++){
      if (files[i].type !== 'image/jpeg' && files[i].type !== 'image/png') {
        $(".sell-form__image__error").append(`<p>ファイル形式はjpeg、またはpngが使用できます。</p>`);

        return false;
      }
    }

    if (imageCount > 10) {
      imageCount -= fileLength;
      $(".sell-form__image").append(`<p>アップロード出来る画像は10枚までです。</p>`);
      return false;
    }
    else if (imageCount == 10) {
      $("#dropbox").css("display", "none");
    }
    else {
      $("#dropbox").css("display", "block");
    }

    $(".sell-form__image__error").empty();

    for (let i = 0; i < fileLength; i++){
      const reader = new FileReader();

      reader.onload = function () {
        resizeImage(reader.result, 600, function (image) {
          imageList.push(image);
          addPreviewToUploadField(image, imageList.length - 1);
        });
      }
      reader.readAsDataURL(files[i]);
    }
  }

  //未入力チェック
  function showError() {
    if (imageCount < 1) {
      $(".sell-form__image__error").html(`<p>画像がありません</p>`);
    }
    else {
      $(".sell-form__image__error").empty();
    }

    if ($("#nameField").val()) {
      $(".sell-form__summary__name__error").empty();
    }
    else {
      $(".sell-form__summary__name__error").html(`<p>入力してください</p>`);
    }

    if ($("#commentField").val()) {
      $(".sell-form__summary__comment__error").empty();
    }
    else {
      $(".sell-form__summary__comment__error").html(`<p>入力してください</p>`);
    }

    if ($("#item_category_id").val()) {
      $(".sell-form__detail__select-box__category__error").empty();
    }
    else {
      $(".sell-form__detail__select-box__category__error").html(`<p>選択してください</p>`);
    }

    if ($("#item_condition").val()) {
      $(".sell-form__detail__select-box__condition__error").empty();
    }
    else {
      $(".sell-form__detail__select-box__condition__error").html(`<p>選択してください</p>`);
    }

    if ($("#item_shipping_fee").val()) {
      $(".sell-form__shipping__select-box__fee__error").empty();
    }
    else {
      $(".sell-form__shipping__select-box__fee__error").html(`<p>選択してください</p>`);
    }

    if ($("#item_prefecture_id").val()) {
      $(".sell-form__shipping__select-box__region__error").empty();
    }
    else {
      $(".sell-form__shipping__select-box__region__error").html(`<p>選択してください</p>`);
    }

    if ($("#item_days_to_ship").val()) {
      $(".sell-form__shipping__select-box__days__error").empty();
    }
    else {
      $(".sell-form__shipping__select-box__days__error").html(`<p>選択してください</p>`);
    }

    if ($("#profitField").text() === "-") {
      $(".sell-form__price__select-box__price-wrap__error").html(`<p>300以上9999999以下で入力してください</p>`);
    }
    else {
      $(".sell-form__price__select-box__price-wrap__error").empty();
    }
  }
});
