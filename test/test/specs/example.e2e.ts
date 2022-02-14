//import fetch from 'node-fetch';
//import {toFile as QRCodeToFile} from 'qrcode'

const APP_ID ='ca.bc.gov.BCWallet'
const SCREENS={
    ONBOARDING:{
        selector:'//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup[1]/android.view.ViewGroup/android.view.ViewGroup[2]/android.view.ViewGroup[1]/android.view.View[@text="Onboarding"]'
    },
    ENTER_PIN: {
        selector: '//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[@text="Enter Pin"]'
    },
    HOME: {
        selector: '//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup[1]/android.view.ViewGroup[2]/android.view.ViewGroup[1]/android.view.View[@text="Home"]'
    }
}

let invitation = null;

describe('BCWallet - Demo', () => {
    before(async ()=>{
        await browser.startRecordingScreen();
    })
    after(async ()=>{
        await browser.saveRecordingScreen(`./videos/BCWallet-demo-${new Date().getTime()}.mp4`);
    })
//before(()=>{
/**
poster custom
size 1.5 1.5
position 0 0 -1.7
rotation 0.1 0 0
default custom.png
**/
//})
    const waitForSelector = async (selector) => {
        let content2 = await browser.$(selector)
        return content2.waitForExist({ timeout: 5000000 }).then(()=>{
        return content2
        })
    }
    it.skip('Onboarding', async () => {
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
              await browser.pause(3000)
              return nextEl
          }
          const waitAndClickNext = async () => {
            return waitAndClick2('//android.widget.TextView[@text="Next"]', '//android.widget.HorizontalScrollView/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1]');
          }
          // Onboarding Screen: 
          // Enter PIN Screen: 
          // Home Screen: 

          //await browser.startRecordingScreen();
          //await browser.removeApp(APP_ID)

          await browser.launchApp()
          await waitAndClickNext();
          await waitAndClickNext();
          await waitAndClickNext();
          await waitAndClick('//android.view.ViewGroup[@content-desc="Get Started"]/android.widget.TextView')
          await browser.pause(3000)
          while(true){
          await browser.performActions([
            {
                "type": "pointer",
                "id": "finger1",
                "parameters": { "pointerType": "touch" },
                "actions": [
                  { "type": "pointerMove", "duration": 0, "x": 441, "y": 1765 },
                  { "type": "pointerDown", "button": 0 },
                  {
                    "type": "pointerMove",
                    "duration": 100,
                    "origin": "viewport",
                    "x": 441,
                    "y": 986
                  },
                  { "type": "pointerUp", "button": 0 }
                ]
            }
          ])
          const continueBtn = await browser.$('//android.view.ViewGroup[@content-desc="Continue"]/android.widget.TextView')
          if (await continueBtn.isExisting()) {
                await (await waitForSelector('//android.view.ViewGroup[@content-desc="I Agree"]/android.widget.TextView')).click()
                await continueBtn.click()
                break
          }
        }
        await browser.pause(5000);
        await (await waitForSelector('~Enter Pin')).setValue("123456");
        await (await waitForSelector('~Re-Enter Pin')).setValue("123456");
        await (await waitForSelector('~Create')).click();
        await browser.pause(5000);
        await browser.terminateApp(APP_ID)
        await browser.pause(5000);
        await browser.activateApp(APP_ID)
        await waitForSelector(SCREENS.ENTER_PIN.selector)
        await (await waitForSelector('~Enter Pin')).setValue("123456");
        await (await waitForSelector('~Submit')).click();
        await waitForSelector(SCREENS.HOME.selector)
        await browser.pause(5000);

    }).timeout(120000);

    it('Obtain Credential', async () => {
        await browser.launchApp()
        await waitForSelector(SCREENS.ENTER_PIN.selector)
        await (await waitForSelector('~Enter Pin')).setValue("123456");
        await (await waitForSelector('~Submit')).click();
        await waitForSelector(SCREENS.HOME.selector)
        await browser.pause(5000);
        const QRCode = await import("qrcode");
        const {default:fetch} = await import('node-fetch');
        
        const response = await fetch('http://localhost:8021/connections/create-invitation', {method: 'POST', headers: {'Content-Type': 'application/json'}});
        invitation = (await response.json() as any)
        const invitation_url = invitation.invitation_url
        console.dir(invitation)
        await QRCode.toFile('C:/Users/cvarjao/AppData/Local/Android/Sdk/emulator/resources/custom.png',  invitation_url, {scale: 8})
        await (await waitForSelector('~Scan')).click();
        await waitForSelector(SCREENS.HOME.selector)
        //await browser.pause(50000);
        // wait for notification
        await (await waitForSelector('~Home')).click();
        await fetch(`http://localhost:8000/issuer/faber/issue-credential/send-offer?${new URLSearchParams({schema_name:'degree schema', connection_id: invitation.connection_id}).toString()}`, {method: 'POST', headers: {'Content-Type': 'application/json'}});
        await waitForSelector('//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1][@text="Notifications"]')
        await (await waitForSelector('//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1][@text="Credential offer"]')).click()
        await (await waitForSelector('//android.widget.TextView[@text="Accept"]')).click()
        await waitForSelector('//android.widget.TextView[@text="Credential added to your wallet"]')
        await (await waitForSelector('//android.widget.TextView[@text="Done"]')).click()
        await (await waitForSelector('//android.view.View[@text="Credentials"]')).click()
    }).timeout(1200000)

    it('Present Credential', async () => {
        const {default:fetch} = await import('node-fetch');
        await browser.launchApp()
        await waitForSelector(SCREENS.ENTER_PIN.selector)
        await (await waitForSelector('~Enter Pin')).setValue("123456");
        await (await waitForSelector('~Submit')).click();
        await waitForSelector(SCREENS.HOME.selector)
        await (await waitForSelector('~Home')).click();
        await fetch(`http://localhost:8000/issuer/faber/present-proof/send-request?${new URLSearchParams({schema_name:'degree schema', connection_id: invitation.connection_id}).toString()}`, {method: 'POST', headers: {'Content-Type': 'application/json'}});
        await waitForSelector('//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1][@text="Notifications"]')
        await (await waitForSelector('//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1][@text="Proof request"]')).click()
        await (await waitForSelector('//android.widget.TextView[@text="Accept"]')).click()
        await waitForSelector('//android.widget.FrameLayout/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1][@text="Notifications"]')
        await browser.pause(5000);
    }).timeout(1200000)
});



