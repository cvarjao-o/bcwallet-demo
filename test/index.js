const wdio = require("webdriverio");

// javascript
const opts = {
    path: '/wd/hub',
    port: 4723,
    logLevel: 'info',
    capabilities: {
      platformName: "Android",
      platformVersion: "11",
      deviceName: "Android Emulator",
      appPackage: "ca.bc.gov.BCWallet",
      appActivity: ".MainActivity",
      automationName: "UiAutomator2",
      appWaitActivity: ".MainActivity"
      //'appium:appWaitActivity': '.MainActivity',
    }
  };
  


  async function main () {
    const client = await wdio.remote(opts);
    
    const waitForSelector = async (selector) => {
      let content2 = await client.$(selector)
      return content2.waitForExist({ timeout: 5000000 }).then(()=>{
        return content2
      })
    }
    const waitAndClick = async (selector) => {
      const nextEl = await waitForSelector(selector);
      return nextEl.click()
    }
    const waitAndClick2 = async (selector, monitorSelector) => {
        let content2 = await waitForSelector(monitorSelector)
        const prevTitle = await content2.getText()
        //console.log(`resourceId: ${await content1.getAttribute('resourceId')}`)
        const nextEl = await waitAndClick(selector);
        content2 = await waitForSelector(monitorSelector)
        while(true){
            const newTitle = await content2.getText()
            if (prevTitle !== newTitle){
                break;
            }
        }
        await client.pause(3000)
        return nextEl
    }
    const waitAndClickNext = async () => {
      return waitAndClick2('//android.widget.TextView[@text="Next"]', '//android.widget.HorizontalScrollView/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1]');
    }
    await client.startRecordingScreen();
    await waitAndClickNext();
    await waitAndClickNext();
    await waitAndClickNext();

    await waitAndClick('//android.view.ViewGroup[@content-desc="Get Started"]/android.widget.TextView')
    console.log('Scrolling up')
    //await waitForSelector('//android.view.ViewGroup[@content-desc="Continue"]/android.widget.TextView').scrollIntoView(false)
    /*
    await client.touchPerform([
      {
        "type": "pointer",
        "id": "finger1",
        "parameters": { "pointerType": "touch" },
        "actions": [
          { "type": "pointerMove", "duration": 0, "x": 418, "y": 1832 },
          { "type": "pointerDown", "button": 0 },
          {
            "type": "pointerMove",
            "duration": 750,
            "origin": "viewport",
            "x": 448,
            "y": 986
          },
          { "type": "pointerUp", "button": 0 }
        ]
      }
    ])
    */
    await client.touchPerform([
      {
        action: 'press',
        options: {"x": 418, "y": 1832},
      },
      {
        action: 'moveTo',
        options: {"x": 418,"y": 986},
      },
      {
        action: 'release',
        options: {},
      }
    ]);
    await client.pause(5000)
    await client.saveRecordingScreen('./recording.mp4');
    await client.pause(60000)
    //const skip = await client.$("skip");
    //  //android.widget.TextView[@text="Skip"]
    await client.deleteSession();
  }
  
  main();
  