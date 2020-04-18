import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { initNotifications, notify } from '@mycv/f8-notification';
import soundURL from './assets/heysound.mp3'
import './App.css';

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = '50';
const TOUCHED_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);
  const [done, setupDone] = useState(false);

  const init = async () => {
    console.log('init...');
    await setupCamera();
    console.log('set up camera success');

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();

    console.log('setup done');
    console.log("Don't touch your face and click Train1");

    initNotifications({ cooldown: 3000 });

    setupDone(true);
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    });
  }

  const train = async label => {
    var addText = document.getElementById('process');
    console.log(`[${label}] Training for you...`);
    for (let i = 0; i < TRAINING_TIMES; ++i) {
      addText.append(`Progress ${parseInt((i+1) / TRAINING_TIMES * 100)}%`);
      await training(label);
      addText.innerHTML = '';
    }
    addText.append(`Progress ${parseInt((49) / TRAINING_TIMES * 100)}%`);
    await sleep(2000);
    addText.innerHTML = '';
    addText.append(`Progress ${parseInt((50) / TRAINING_TIMES * 100)}%`);
    await sleep(500);
    addText.innerHTML = '';
    addText.append("Training Complete")
  }

  /**
   * 
   * @param {*} label 
   */

  const training = label => {
    return new Promise(async resolve => {
      const embedding =mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }

  const run = async () => {
    const embedding =mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
      ) {
        if (canPlaySound.current) {
          canPlaySound.current = false;
          sound.play();
        }
        notify('Hands Off!', { body: "Don't touch your face" });
        setTouched(true);
      } else {
        setTouched(false);
      }

    await sleep(200);

    run();
  }

	  const sleep = (ms = 0) => {
	    return new Promise(resolve => setTimeout(resolve, ms))
	  }

  useEffect(() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true;
    });

    //cleanup
    return () => {

    }
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`} >
      <video 
        ref={video}
        className="video"
        autoPlay
      />

      <p id="process"></p>

      <div className={`control ${done ? 'control-done' : ''}`}>

        <button className="btn" title="Don't touch your face and click `Train 1`"
        onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>

        <button className="btn" title="Touch your face and click `Train 2`"
        onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
    
        <button className="btn" title="Click `Run` after complete `Train 1` and `Train 2`"
        onClick={() => run()}>Run</button>

      </div>
    </div>
  );
}

export default App;
