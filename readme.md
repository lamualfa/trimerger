# DEPRECATED

Please use **[videlo](https://github.com/lamualfa/videlo)** instead.

<hr>

<h1 align="center">Trimerger</h1> 

<p align="center">
  <img alt="Screenshot" src="https://raw.githubusercontent.com/lamualfa/trimerger/main/screenshot.png" width="640" />
</p>

<p align="center">
  ✂️ Easily trim a video using multiple timestamps with FFMPEG.
</p>

<p align="center">
  <img alt="NPM Version Badge" src="https://badgen.net/npm/v/trimerger?color=red">
  <img alt="FFMPEG Version Badge" src="https://badgen.net/static/ffmpeg/6.0/green">
  <img alt="License Badge" src="https://badgen.net/github/license/lamualfa/trimerger?color=purple">
</p>

<hr/>

## Usage

**Important!**

Please run the following command inside the folder where your video is located.

**`NPM`**
```bash
npx trimerger
```

**`PNPM`**
```bash
pnpm dlx trimerger
```

**`Yarn`**
```bash
yarn dlx trimerger
```

## Notes

- Currently `trimerger` only support `.mp4` video.
- The trimming results may not accurate because we don't re-encode the video for performance purpose. The accurate option will be implemented later.
- This is a side project. I have no plans to add advanced features.
