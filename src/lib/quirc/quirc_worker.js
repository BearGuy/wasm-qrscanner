var image=null;
var width, height;
var counted;

var Module = {};

// We start by importing our quirc.js script
importScripts('/lib/quirc/quirc.js');


self.onmessage = function(msg) {
  quirc_process_image_data(msg.data);
  postMessage('done');
}

// Our worker recieves raw image data from the decoder,
// then it posts the message back to our listeners.
self.decoded = function(i, version, ecc_level, mask, data_type, payload, payload_len) {
  console.log("WE DECODED");
  var payload_string = String.fromCharCode.apply(null,
    new Uint8Array(Module.HEAPU8.buffer, payload, payload_len));
  postMessage({
    i,
    version,
    ecc_level,
    mask,
    data_type,
    payload,
    payload_len,
    payload_string
  });
}

// Receives a simple string with an error
self.decode_error = function(errstr) {
  console.log("decode error: " + errstr);
}

function quirc_process_image_data(img_data) {
  if (!image) {
    width = img_data.width;
    height = img_data.height;
    image = Module._xsetup(width, height);
  }

  var data = img_data.data;

  for (var i=0, j=0; i < data.length; i+=4, j++) {
    // We convert our image data into grayscale here
    // This is to help with edge detection when quirc is attempting pattern recognition
    Module.HEAPU8[image + j] = (data[i] * 66 + data[i + 1] * 129 + data[i + 2] * 25 + 4096) >> 8;
  }

  // Note that "decoded" and/or "decode_error" will be called from within
  var a = Module._xprocess();
}