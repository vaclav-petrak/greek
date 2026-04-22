let dictionary = [];
let currentIndex = 0;
let isRevealed = false;
let renderTimeout;
let currentAudio = null;
let assetBasePath = '../assets';

async function fetchJsonWithFallback(urls) {
    let lastError;
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }
            return { url, json: await response.json() };
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError;
}

function getWordSoundSrc(wordData) {
    if (wordData.sound === null) return null;
    if (wordData.sound) return wordData.sound;
    if (!wordData.id) return null;
    return `${assetBasePath}/sounds/${wordData.id}.mp3`;
}

// Updated to return an array of image sources (.webp first, then .png)
function getImageSources(wordData) {
    if (wordData.image === null) return [];
    if (wordData.image) return [wordData.image];
    if (!wordData.id) return [];
    
    return [
        `${assetBasePath}/images/${wordData.id}.webp`,
        `${assetBasePath}/images/${wordData.id}.png`
    ];
}

function getExampleSoundSrc(wordData, exampleData, index) {
    if (exampleData && exampleData.sound === null) return null;
    if (exampleData && exampleData.sound) return exampleData.sound;
    if (!wordData.id) return null;
    return `${assetBasePath}/sounds/${wordData.id}_${index + 1}.mp3`;
}

function showImageFallback(imgPane, text) {
    imgPane.style.display = 'flex';
    imgPane.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'image-fallback';
    fallback.textContent = text;
    imgPane.appendChild(fallback);
}

function playSound(src) {
    if (!src) return;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(src);
    currentAudio.play();
}

const presentation = document.getElementById('presentation');

async function loadDictionary() {
    try {
        const { url, json } = await fetchJsonWithFallback([
            './data/dictionary.json',
            '/data/dictionary.json',
            '../data/dictionary.json'
        ]);
        dictionary = json;

        assetBasePath = url.startsWith('/') ? '/assets' : './assets';

        // Shuffle dictionary order on initial load
        for (let i = dictionary.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dictionary[i], dictionary[j]] = [dictionary[j], dictionary[i]];
        }
        currentIndex = 0;
        renderSlide();
    } catch (error) {
        console.error('Failed to load dictionary:', error);
        document.getElementById('frontWord').textContent = 'Error loading dictionary';
    }
}

loadDictionary();

function renderSlide() {
    if (dictionary.length === 0) return;
    
    const wordData = dictionary[currentIndex];
    const fullGreekWord = wordData.article ? `${wordData.article} ${wordData.greek_word}` : wordData.greek_word;

    clearTimeout(renderTimeout);

    // 1. ALWAYS update the Front Slide immediately. 
    // If the card is flipping back, this ensures the new word is what comes into view.
    document.getElementById('frontWord').innerText = fullGreekWord;

    if (isRevealed) {
        // 2. Hide the card (triggering the CSS flip/fade back to the front)
        isRevealed = false;
        presentation.classList.remove('is-revealed');

        // 3. Wait for the animation to finish before updating the hidden Reveal slide
        // NOTE: Keep this at your exact CSS transition time (e.g., 300ms)
        renderTimeout = setTimeout(() => {
            updateRevealDOM(wordData, fullGreekWord);
        }, 300); 
    } else {
        // If we are already on the front, update the hidden Reveal slide immediately
        updateRevealDOM(wordData, fullGreekWord);
    }
}

// This function now ONLY updates the back/reveal side of the card
function updateRevealDOM(wordData, fullGreekWord) {
    const revealWordEl = document.getElementById('revealWord');
    revealWordEl.innerText = fullGreekWord;

    const wordSoundSrc = getWordSoundSrc(wordData);
    if (wordSoundSrc) {
        revealWordEl.style.cursor = 'pointer';
        revealWordEl.classList.add('audio-link');
        revealWordEl.onclick = (e) => { e.stopPropagation(); playSound(wordSoundSrc); };
    } else {
        revealWordEl.style.cursor = '';
        revealWordEl.classList.remove('audio-link');
        revealWordEl.onclick = null;
    }
    document.getElementById('transliteration').innerText = `/${wordData.transliteration}/`;
    document.getElementById('translation').innerText = wordData.translation.join(', ');
    
    // Display word ID
    document.getElementById('wordId').innerText = wordData.id;

    // Handle Image with .webp to .png fallback
    const imgPane = document.getElementById('imagePane');
    const imageSources = getImageSources(wordData);

    if (imageSources.length === 0) {
        showImageFallback(imgPane, fullGreekWord);
    } else {
        imgPane.style.display = 'flex';
        imgPane.innerHTML = '';
        const img = document.createElement('img');
        
        let currentSrcIndex = 0;
        img.src = imageSources[currentSrcIndex];
        img.alt = wordData.greek_word;
        
        img.onerror = () => {
            currentSrcIndex++;
            // Try the next format in the array
            if (currentSrcIndex < imageSources.length) {
                img.src = imageSources[currentSrcIndex];
            } else {
                // Out of options, show the text fallback
                showImageFallback(imgPane, fullGreekWord);
            }
        };
        
        imgPane.appendChild(img);
    }

    // Handle Tags
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';
    if (wordData.part_of_speech) tagsContainer.innerHTML += `<span class="tag">${wordData.part_of_speech}</span>`;
    if (wordData.gender) tagsContainer.innerHTML += `<span class="tag" style="background-color: #fce7f3; color: #be185d;">${wordData.gender}</span>`;

    // Handle Examples
    const examplesContainer = document.getElementById('examplesContainer');
    examplesContainer.innerHTML = '';
    if (wordData.examples && wordData.examples.length > 0) {
        const examplesToShow = wordData.examples.slice(0, 3);
        examplesToShow.forEach(ex => {
            examplesContainer.innerHTML += `
                <div class="example-block">
                    <div class="example-greek">${ex.greek}</div>
                    <div class="example-eng">${ex.translation}</div>
                </div>
            `;
        });
        
        examplesContainer.querySelectorAll('.example-greek').forEach((el, i) => {
            const sound = getExampleSoundSrc(wordData, examplesToShow[i], i);
            if (sound) {
                el.style.cursor = 'pointer';
                el.classList.add('audio-link');
                el.onclick = (e) => { e.stopPropagation(); playSound(sound); };
            } else {
                el.style.cursor = '';
                el.classList.remove('audio-link');
                el.onclick = null;
            }
        });
    }
}

function toggleReveal() {
    isRevealed = !isRevealed;
    presentation.classList.toggle('is-revealed', isRevealed);
    if (isRevealed) {
        const wordData = dictionary[currentIndex];
        playSound(getWordSoundSrc(wordData));
    }
}

function nextWord(e) {
    if (e) e.stopPropagation(); 
    currentIndex = (currentIndex + 1) % dictionary.length;
    renderSlide();
}

function prevWord(e) {
    if (e) e.stopPropagation(); 
    currentIndex = (currentIndex - 1 + dictionary.length) % dictionary.length;
    renderSlide();
}

// Event Listeners
presentation.addEventListener('click', toggleReveal);
document.getElementById('btnNext').addEventListener('click', nextWord);
document.getElementById('btnPrev').addEventListener('click', prevWord);

// Keyboard Controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        toggleReveal();
    } else if (e.code === 'ArrowRight') {
        nextWord();
    } else if (e.code === 'ArrowLeft') {
        prevWord();
    }
});