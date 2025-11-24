/**
 * 解析 Pulp Fiction 劇本並轉換為可匯入格式
 * 
 * 使用方法：
 * node scripts/parse-pulp-fiction.js > pulp-fiction-import.json
 */

const fs = require('fs');
const path = require('path');

// 讀取 PDF 文本內容（從 websearch 結果）
const pulpFictionText = `INT. COFFEE SHOP - MORNING

A normal Denny's, Spires-like coffee shop in Los Angeles. It's about 9:00 in the morning. While the place isn't jammed, there's a healthy number of people drinking coffee, munching on bacon and eating eggs.

Two of these people are a YOUNG MAN and a YOUNG WOMAN. The Young Man has a slight working-class English accent and, like his fellow countryman, smokes cigarettes like they're going out of style.

It is impossible to tell where the Young Woman is from or how old she is; everything she does contradicts something she did. The boy and girl sit in a booth. Their dialogue is to be said in a rapidpace "HIS GIRL FRIDAY" fashion.

YOUNG MAN
No, forget it, it's too risky. I'm through
doin' that shit.
YOUNG WOMAN
You always say that, the same thing every
time: never again, I'm through, too
dangerous.
YOUNG MAN
I know that's what I always say. I'm
always right too, but -
YOUNG WOMAN

- but you forget about it in a day or two
-

YOUNG MAN

- yeah, well, the days of me forgittin'
are over, and the days of me rememberin'
have just begun.
YOUNG WOMAN
When you go on like this, you know what
you sound like?
YOUNG MAN
I sound like a sensible fucking man, is
what I sound like.

---

# YOUNG WOMAN 

You sound like a duck.
(imitates a duck)
Quack, quack, quack, quack, quack, quack, quack...

YOUNG MAN
Well take heart, 'cause you're never gonna
hafta hear it again. Because since I'm never gonna do it again, you're never gonna hafta hear me quack about how I'm never gonna do it again.

YOUNG WOMAN
After tonight.
The boy and girl laugh, their laughter putting a pause in there, back and forth.

YOUNG MAN
(with a smile)
Correct. I got all tonight to quack.
A WAITRESS comes by with a pot of coffee.
WAITRESS
Can I get anybody anymore coffee?
YOUNG WOMAN
Oh yes, thank you.
The Waitress pours the Young Woman's coffee. The Young Man lights up another cigarette.

YOUNG MAN
I'm doin' fine.
The Waitress leaves. The Young Man takes a drag off of his smoke. The Young Woman pours a ton of cream and sugar into her coffee.

The Young Man goes right back into it.
YOUNG MAN
I mean the way it is now, you're takin' the same fuckin' risk as when you rob a bank. You take more of a risk. Banks are easier! Federal banks aren't supposed to stop you anyway, during a robbery. They're insured, why should they care? You don't even need a gun in a federal bank. I heard about this guy, walked into a federal bank with a portable phone, handed the phone to the teller, the guy on the other end of the phone said: "We got this guy's little girl, and if you don't give him all your money, we're gonna kill 'er."

YOUNG WOMAN
Did it work?

---

# YOUNG MAN 

Fuckin' A it worked, that's what I'm
talkin' about! Knucklehead walks in a bank with a telephone, not a pistol, not a shotgun, but a fuckin' phone, cleans the place out, and they don't lift a fuckin' finger.

YOUNG WOMAN
Did they hurt the little girl?

## YOUNG MAN

I don't know. There probably never was a little girl - the point of the story isn't the little girl. The point of the story is they robbed the bank with a telephone.

YOUNG WOMAN
You wanna rob banks?

YOUNG MAN
I'm not sayin' I wanna rob banks, I'm just
illustrating that if we did, it would be easier than what we been doin'.

YOUNG WOMAN
So you don't want to be a bank robber?

YOUNG MAN
Naw, all those guys are goin' down the same road, either dead or servin' twenty.

YOUNG WOMAN
And no more liquor stores?

YOUNG MAN
What have we been talking about? Yeah, no-more-liquor-stores. Besides, it ain't the giggle it usta be. Too many foreigners own liquor stores. Vietnamese, Koreans, they can't fuckin' speak English. You tell 'em: "Empty out the register," and they don't know what it fuckin' means. They make it too personal. We keep on, one of those
gook motherfuckers' gonna make us kill 'em.

YOUNG WOMAN
I'm not gonna kill anybody.

---

# YOUNG MAN 

I don't wanna kill anybody either. But they'll probably put us in a situation where it's us of them. And if it's not the
gooks, it these old Jews who've owned the store for fifteen fuckin' generations. Ya got Grandpa Irving sittin' behind the counter with a fuckin' Magnum. Try walkin' into one of those stores with nothin' but a telephone, see how far it gets you. Fuck it, forget it, we're out of it.

YOUNG WOMAN
Well, what else is there, day jobs?
YOUNG MAN
(laughing)
Not this life.
YOUNG WOMAN
Well what then?
He calls to the Waitress.
YOUNG MAN
Garcon! Coffee!
Then looks to his girl.
YOUNG MAN
This place.
The Waitress comes by, pouring him some more.
WAITRESS
(snotty)
"Garcon" means boy.
She splits.
YOUNG WOMAN
Here? It's a coffee shop.
YOUNG MAN
What's wrong with that? People never rob restaurants, why not? Bars, liquor stores, gas stations, you get your head blown off stickin' up one of them. Restaurants, on the other hand, you catch with their pants down. They're not expecting to get robbed, or not as expecting.

YOUNG WOMAN
(taking to idea)
I bet in places like this you couldcut
down on the hero factor.

---

YOUNG MAN
Correct. Just like banks, these places are
insured. The managers don't give a fuck,
they're just tryin' to get ya out the door
before you start pluggin' diners.
Waitresses, forget it, they ain't takin' a
bullet for the register. Busboys, some
wetback gettin' paid a dollar fifty a hour
gonna really give a fuck you're stealin'
from the owner. Customers are sittin'
there with food in their mouths, they
don't know what's goin' on. One minute
they're havin' a Denver omelette, next
minute somebody's stickin' a gun in their
face.

The Young Woman visibly takes in the idea. The Young Man continues in a low voice.

YOUNG MAN
See, I got the idea last liquor store we
stuck up. 'Member all those customers kept
comin' in?

YOUNG WOMAN
Yeah.

YOUNG MAN
They you got the idea to take everybody's
wallet.

YOUNG WOMAN
Uh-huh.

YOUNG MAN
That was a good idea.

YOUNG WOMAN
Thanks.

YOUNG MAN
We made more from the wallets then we did
the register.

YOUNG WOMAN
Yes we did.

YOUNG MAN
A lot of people go to restaurants.

YOUNG WOMAN
A lot of wallets.

YOUNG MAN
Pretty smart, huh?

The Young Woman scans the restaurant with this new information. She sees all the PATRONS eating, lost in conversations. The tires WAITRESS, taking orders. The BUSBOYS going through the motions,...

...(省略其他場景)...

JULES
(to himself)
It's cold.
He pushes it aside.
Vincent appears next to Jules.
VINCENT
I think we oughta leave now.
JULES
That's probably a good idea.
Vincent throws some money on the table and Jules grabs the briefcase.

Then, to the amazement of the Patrons, the Waitresses, the Cooks, the Bus Boys, and the Manager, these two bad-ass dudes - wearing UC Santa Cruz and "I'm with Stupid" tee-shirts, swim trunks, thongs and packing . 45 Automatics - walk out of the coffee shop together without saying a word.

FADE OUT

THE END`;

// 解析好萊塢格式劇本
function parseHollywoodScript(scriptText) {
  const lines = scriptText.split('\n');
  const scenes = [];
  let currentScene = null;
  let sceneNumber = 1;
  
  // 場景標題正則（INT./EXT. 場景名稱 - 時間）
  const sceneHeadingPattern = /^(INT\.|EXT\.)\s+(.+?)\s*-\s*(.+)$/i;
  // 角色名稱正則（全大寫，不是場景標題，不在括號內）
  const characterPattern = /^[A-Z][A-Z\s&.']+$/;
  // 動作描述（普通文字，不是場景標題，不是角色名稱）
  
  let currentContent = [];
  let inDialogue = false;
  let currentCharacter = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳過空行和分隔線
    if (!line || line.match(/^[-=]+$/)) {
      if (inDialogue && currentCharacter) {
        inDialogue = false;
      }
      continue;
    }
    
    // 檢查是否是場景標題
    const sceneMatch = line.match(sceneHeadingPattern);
    if (sceneMatch) {
      // 保存上一個場景
      if (currentScene && currentContent.length > 0) {
        currentScene.content = currentContent.join('\n');
        scenes.push(currentScene);
      }
      
      // 創建新場景
      const [, sceneType, location, time] = sceneMatch;
      currentScene = {
        id: `scene-${sceneNumber}`,
        number: sceneNumber++,
        title: `${sceneType} ${location}`,
        location: location.trim(),
        dayNight: time.trim(),
        content: '',
        beatId: null // 可以手動分配到大綱
      };
      currentContent = [];
      inDialogue = false;
      currentCharacter = '';
      continue;
    }
    
    // 檢查是否是角色名稱（全大寫，短行，後面可能有括號說明）
    if (characterPattern.test(line) && line.length < 40 && !line.includes('.')) {
      // 可能是角色名稱
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      
      // 如果下一行是對白或動作，確認這是角色名稱
      if (nextLine && (nextLine.length > 0 && !characterPattern.test(nextLine))) {
        // 結束之前的對白
        if (inDialogue && currentCharacter) {
          inDialogue = false;
        }
        
        // 新的角色和對白
        currentCharacter = line.replace(/\s*\([^)]*\)\s*$/, '').trim();
        
        // 添加角色名稱到內容（Markdown 格式）
        currentContent.push(`### ${currentCharacter}`);
        inDialogue = true;
        continue;
      }
    }
    
    // 如果是動作描述或對白
    if (currentScene) {
      // 如果在對白模式中，添加對白（Markdown 格式）
      if (inDialogue && currentCharacter) {
        // 檢查是否是動作指示（在括號中）
        if (line.match(/^\(.+\)$/)) {
          // 動作指示，加到當前對白前
          currentContent[currentContent.length - 1] += ` (${line.slice(1, -1)})`;
        } else {
          // 對白內容
          currentContent.push(`> ${line}`);
        }
      } else {
        // 動作描述（普通段落）
        if (line && !line.match(/^(FADE|THE END)/i)) {
          currentContent.push(line);
        }
      }
    }
  }
  
  // 保存最後一個場景
  if (currentScene && currentContent.length > 0) {
    currentScene.content = currentContent.join('\n');
    scenes.push(currentScene);
  }
  
  return scenes;
}

// 解析劇本
const scenes = parseHollywoodScript(pulpFictionText);

// 創建匯入格式
const importData = {
  scriptData: {
    title: 'PULP FICTION',
    coreIdea: 'PULP [pulp] n. 1. A soft, moist, shapeless mass or matter. 2. A magazine or book containing lurid subject matter and being characteristically printed on rough, unfinished paper.',
    author: 'Quentin Tarantino & Roger Avary',
    version: '1.0'
  },
  outline: {
    opening: '',
    theme: '',
    setup: '',
    catalyst: '',
    debate: '',
    break1: '',
    bstory: '',
    fun: '',
    midpoint: '',
    badguys: '',
    allislost: '',
    darksoul: '',
    break2: '',
    finale: '',
    final: ''
  },
  scenes: scenes,
  exportDate: new Date().toISOString(),
  version: '1.0'
};

// 輸出 JSON
console.log(JSON.stringify(importData, null, 2));



