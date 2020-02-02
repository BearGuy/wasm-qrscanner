import { h, createRef, Component } from '/web_modules/preact.js'

type QRScannerProps = {}
type QRScannerState = {
  decoded_message: ''
}

// let canvas_ctx: CanvasRenderingContext2D = undefined;

class QRScanner extends Component<QRScannerProps, QRScannerState> {
  video = createRef();
  canvas = createRef();
  file_input = createRef();

  isStreamInit = false;
  constraints = {
    audio: false,
    video: {
      facingMode: 'environment'
    }
  };

  // quirc wasm
  // canvas_context: CanvasRenderingContext2D;
  decoder = new Worker('/lib/quirc/quirc_worker.js');
  last_scanned_raw = new Date().getTime();
  last_scanned_at = new Date().getTime();

  // In milliseconds
  debounce_timeout = 750;

  constructor() {
    super();
  }

  async componentDidMount() {
    this.decoder.onmessage = (decoded_msg) => { this.onDecoderMessage(decoded_msg) };
    try {
      let stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.handleSuccess(stream);
    } catch (err) {
      this.handleError(err);
    }
    setTimeout(() => { this.attemptQRDecode() }, this.debounce_timeout);
  }

  handleSuccess(stream: any) {
    this.video.current.srcObject = stream;
    this.isStreamInit = true;
  }

  handleError(error: Error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
  }

  attemptQRDecode() {
    if (this.isStreamInit)  {
      try {
        let canvas_ctx = this.canvas.current.getContext("2d");
        this.canvas.current.width = this.video.current.videoWidth;
        this.canvas.current.height = this.video.current.videoHeight;
        canvas_ctx.drawImage(this.video.current, 0, 0, this.canvas.current.width, this.canvas.current.height);

        var imgData = canvas_ctx.getImageData(0, 0, this.canvas.current.width, this.canvas.current.height);
        if (imgData.data) {
          console.log(imgData);
          this.decoder.postMessage(imgData);
        }
      } catch (err) {
        if (err.name == 'NS_ERROR_NOT_AVAILABLE') setTimeout(() => { this.attemptQRDecode() }, 0);
          console.log("Error");
          console.log(err);
      }
    }
  }

  onDecoderMessage(msg: any) {
    if (msg.data != 'done') {
      const qrid = msg.data['payload_string'];
      const right_now = Date.now();
      console.log(qrid);
      if (qrid != this.last_scanned_raw || this.last_scanned_at < right_now - this.debounce_timeout) {
        this.last_scanned_raw = qrid;
        this.last_scanned_at = right_now;

        alert(qrid);
        //this.setState({ decoded_message: qrid });
      } else if (qrid == this.last_scanned_raw) {
        this.last_scanned_at = right_now;
      }
    }
    setTimeout(() => { this.attemptQRDecode() }, this.debounce_timeout);
  }

  decodeFromFile(f: File) {
    var reader = new FileReader();
    const URL = window.URL || window.webkitURL;
    reader.onload = (file => {
      return (e: any) => {
        var img = new Image();
        img.onload = () => {
          let canvas_ctx = this.canvas.current.getContext("2d");
          canvas_ctx.drawImage(img, 0, 0, img.width, img.height);
          let imgData = canvas_ctx.getImageData(0, 0, img.width, img.height);
          if (imgData.data) {
            console.log(imgData);
            this.decoder.postMessage(imgData);
          }
        }
        let urlData: string = reader.result as string;
        img.src = urlData;
      };
    })(f);
    reader.readAsDataURL(f);
  }

  onButtonClick() {
    let inputFile  = this.file_input.current;
    inputFile.onchange = (e: any) => {
      let file = e.target.files[0];

      // Check we give a file
      if (!file) return;

      // Check that the file is an image
      if(file.type !== '' && !file.type.match('image.*')) return;
      this.decodeFromFile(file);
    };
    inputFile.click();
  }

  render() {
    return (
      <div>
        <div id="qr-hud">
          <div class="opaque-black" id="qr-hud-header">
            <h2>QR Code Scanner</h2>
          </div>
          <div id="qr-hud-body">
            <div class="opaque-black" id="qr-hud-top"></div>
            <div id="qr-hud-mid">
              <div class="opaque-black"></div>
              <div id="qr-hud-target"></div>
              <div class="opaque-black"></div>
            </div>
            <div class="opaque-black" id="qr-hud-bot"></div>
          </div>
        </div>
        <div class="video-container">
          <video playsInline autoPlay ref={this.video}></video>
        </div>
        <canvas id="qr-canvas" ref={this.canvas}></canvas>

        {/* We'll be appending this to our screeen */}

        <input id="file-input" type="file" ref={this.file_input}/>
        <button id="qr-scanner-button" class="create-button" onClick={() => this.onButtonClick()}>
          <img src="/assets/image-regular.svg" class="image-svg" />
        </button>

      </div>
    )
  }
}

export default QRScanner