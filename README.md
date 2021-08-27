<p align="center">
  <img width="345" src="https://raw.githubusercontent.com/recogito/annotorious/master/annotorious-logo-white-small.png" />
  <br/><br/>
</p>
A JavaScript image annotation library. Add drawing, commenting and labeling functionality to images
in Web pages with just a few lines of code. 

### Motivation of  this modification:

Using this project we can annotate on any image. But we need something custom, we want to render some rectangular on pdf file (File Viewer). To solve this issue, we used this library and modify some portions to make things work on the `div`.

#### Problem statement: 

```javascript
<div id="hallstatt">
    <img src="640px-Hallstatt.jpg" />
</div>
```

if we pass the id of `div` instead of `image`, then we can render the box but not those boxes aren't resizable.

### Solution:

```javascript
var anno = Annotorious.init({
        image: 'hallstatt',
        height: 500,
        width: 500,
});
```

pass height and width manually, if you are using other components instead of `img`.

### Build Project

To build this project, run

```bash
npm run build
```

To import this thing into React App, use this line

```js
import {Annotorious} from '@recogito/annotorious/dist/annotorious.min';
import '@recogito/annotorious/dist/annotorious.min.css';
```

That's it. we are done







See the [project website](https://recogito.github.io/annotorious/)
for details and live demos.

<img width="620" src="https://raw.githubusercontent.com/recogito/annotorious/master/screenshot.jpg" />

## Installing

If you use npm, `npm install @recogito/annotorious` and 

```javascript
import { Annotorious } from '@recogito/annotorious';

import '@recogito/annotorious/dist/annotorious.min.css';

const anno = new Annotorious({ image: 'hallstatt' }); // image element or ID
```

Otherwise download the [latest release](https://github.com/recogito/annotorious/releases/latest)
and include it in your web page.

```html
<link rel="stylesheet" href="annotorious.min.css">
<script src="annotorious.min.js"></script>
```

## Using

```html
<body>
  <div id="content">
    <img id="hallstatt" src="640px-Hallstatt.jpg">
  </div>
  <script>
    (function() {
      var anno = Annotorious.init({
        image: 'hallstatt'
      });

      anno.loadAnnotations('annotations.w3c.json');
    })()
  </script>
  <script type="text/javascript" src="annotorious.min.js"></script>
</body>
```
Full documentation is [on the project website](https://recogito.github.io/annotorious/). Questions? Feedack? Feature requests? Join the 
[Annotorious chat on Gitter](https://gitter.im/recogito/annotorious).

[![Join the chat at https://gitter.im/recogito/annotorious](https://badges.gitter.im/recogito/annotorious.svg)](https://gitter.im/recogito/annotorious?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## License

[BSD 3-Clause](LICENSE) (= feel free to use this code in whatever way
you wish. But keep the attribution/license file, and if this code
breaks something, don't complain to us :-)

## Who's Using Annotorious

![NHS Wales Logo](logos/NHSWalesCavLogo.png) &nbsp; [![MicroPasts Logo](logos/MicroPasts.png)](https://crowdsourced.micropasts.org/)

Using Annotorious? [Let us know!](https://gitter.im/recogito/annotorious)
