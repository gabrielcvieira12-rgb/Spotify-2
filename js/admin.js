

// 2. Configuração do seu Cloudinary
const CLOUD_NAME = "jylqffg6"; 
const UPLOAD_PRESET = "soundflow"; 

// Mapeando os elementos da tela
const form = document.getElementById('add-music-form');
const btnSubmit = document.getElementById('btn-submit');

// Função para fazer o upload de arquivos para o Cloudinary
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://cloudinary.com{CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Falha no upload para o Cloudinary.');
    }

    const data = await response.json();
    return data.secure_url; 
}

// Evento ao enviar o formulário
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnSubmit.innerText = "Enviando arquivos...";
    btnSubmit.disabled = true;

    const title = document.getElementById('title').value;
    const artist = document.getElementById('artist').value;
    const album = document.getElementById('album').value;
    
    const coverFile = document.getElementById('cover-file').files[0];
    const audioFile = document.getElementById('audio-file').files[0];

    try {
        console.log("Fazendo upload da capa...");
        const coverUrl = await uploadToCloudinary(coverFile);

        console.log("Fazendo upload do áudio...");
        const audioUrl = await uploadToCloudinary(audioFile);

        console.log("Gravando dados no Realtime Database...");
        // Salva na rota /musicas do seu banco de dados
        await db.ref('musicas').push({
            title: title,
            artist: artist,
            album: album,
            coverUrl: coverUrl,
            audioUrl: audioUrl,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        alert("Música adicionada com sucesso!");
        form.reset(); 

    } catch (error) {
        console.error("Erro completo:", error);
        alert("Ocorreu um erro. Abra o Console (F12) para detalhes.");
    } finally {
        btnSubmit.innerText = "Adicionar ao App";
        btnSubmit.disabled = false;
    }
});
