// ==============================
// CONFIGURAÇÃO E IMPORTS
// ==============================

import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    ref,
    push,
    set,
    get,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";


// ==============================
// CLOUDINARY
// ==============================

const CLOUD_NAME = "jylqffg6";
const UPLOAD_PRESET = "soundflow";

async function enviarCloudinary(arquivo) {

    const formData = new FormData();

    formData.append("file", arquivo);
    formData.append("upload_preset", UPLOAD_PRESET);

    const resposta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!resposta.ok) {
        throw new Error("Erro ao enviar arquivo para o Cloudinary.");
    }

    const dados = await resposta.json();

    return dados.secure_url;
}


// ==============================
// ELEMENTOS DO DOM
// ==============================

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");

const authMessage = document.getElementById("auth-message");
const adminNav = document.getElementById("admin-nav");

const musicList = document.getElementById("music-list");
const searchList = document.getElementById("search-list");
const searchInput = document.getElementById("search-input");

const audio = document.getElementById("audio");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");

const adminMusicList = document.getElementById("admin-music-list");


// ==============================
// VARIÁVEIS
// ==============================

let usuarioAtual = null;
let ehAdmin = false;
let todasMusicas = [];


// ==============================
// CADASTRO
// ==============================

registerBtn?.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if (!email || !senha) {
        authMessage.textContent = "Preencha email e senha.";
        return;
    }

    try {

        const resultado = await createUserWithEmailAndPassword(
            auth,
            email,
            senha
        );

        const user = resultado.user;

        // Cria o usuário no Realtime Database
        await set(ref(db, `usuarios/${user.uid}`), {

            nome: email.split("@")[0],

            role: "user",

            criadoEm: Date.now()

        });

        authMessage.textContent = "Cadastro realizado com sucesso!";

    } catch (erro) {

        console.error(erro);

        authMessage.textContent = "Erro ao cadastrar.";

    }

});


// ==============================
// LOGIN
// ==============================

loginBtn?.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if (!email || !senha) {

        authMessage.textContent = "Preencha email e senha.";

        return;
    }

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            senha
        );

        authMessage.textContent = "";

    } catch (erro) {

        console.error(erro);

        authMessage.textContent =
            "Email ou senha incorretos.";

    }

});


// ==============================
// LOGOUT
// ==============================

logoutBtn?.addEventListener("click", async () => {

    await signOut(auth);

});


// ==============================
// AUTENTICAÇÃO
// ==============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        usuarioAtual = null;

        ehAdmin = false;

        loginScreen.style.display = "flex";

        app.style.display = "none";

        if (adminNav) {
            adminNav.style.display = "none";
        }

        return;
    }


    usuarioAtual = user;

    loginScreen.style.display = "none";

    app.style.display = "flex";


    try {

    const snapshot = await get(
        ref(db, `usuarios/${user.uid}`)
    );

    console.log("UID logado:", user.uid);
    console.log("Usuário encontrado no Realtime Database:", snapshot.exists());

    if (snapshot.exists()) {

        const dados = snapshot.val();

        console.log("Dados do usuário:", dados);
        console.log("Role:", dados.role);

        ehAdmin = dados.role === "admin";

    } else {

        console.log("Usuário não encontrado no Realtime Database.");

        ehAdmin = false;

    }

        if (adminNav) {
        adminNav.style.display = ehAdmin ? "block" : "none";
    }

    console.log("É administrador?", ehAdmin);

    } catch (erro) {

        console.error(
            "Erro ao verificar usuário:",
            erro
        );

        ehAdmin = false;

    }


    // Mostra o menu de admin somente para administrador

    if (adminNav) {

        adminNav.style.display =
            ehAdmin ? "block" : "none";

    }


    carregarMusicas();

});


// ==============================
// CARREGAR MÚSICAS
// ==============================

function carregarMusicas() {

    const musicasRef = ref(db, "musicas");


    onValue(
        musicasRef,

        (snapshot) => {

            todasMusicas = [];


            if (snapshot.exists()) {

                snapshot.forEach((childSnapshot) => {

                    todasMusicas.push({

                        id: childSnapshot.key,

                        ...childSnapshot.val()

                    });

                });

            }


            mostrarMusicas(todasMusicas);


            if (ehAdmin) {

                mostrarMusicasAdmin(todasMusicas);

            }

        },


        (erro) => {

            console.error(
                "Erro ao carregar músicas:",
                erro
            );

        }

    );

}


// ==============================
// MOSTRAR MÚSICAS
// ==============================

function mostrarMusicas(musicas) {

    if (!musicList) return;

    musicList.innerHTML = "";


    if (musicas.length === 0) {

        musicList.innerHTML =
            "<p>Nenhuma música cadastrada.</p>";

        return;
    }


    musicas.forEach((musica) => {

        const card =
            document.createElement("div");

        card.className = "music-card";


        card.innerHTML = `

            <img
                src="${musica.coverUrl || ""}"
                alt="${musica.title || "Música"}"
            >

            <h3>
                ${musica.title || "Sem título"}
            </h3>

            <p>
                ${musica.artist || "Artista desconhecido"}
            </p>

            <button class="play-music">
                ▶ Tocar
            </button>

        `;


        const botao =
            card.querySelector(".play-music");


        botao.addEventListener(
            "click",
            () => {

                tocarMusica(musica);

            }
        );


        musicList.appendChild(card);

    });

}


// ==============================
// REPRODUTOR
// ==============================

function tocarMusica(musica) {

    if (!audio) return;


    audio.src = musica.audioUrl;


    if (playerTitle) {

        playerTitle.textContent =
            musica.title || "";

    }


    if (playerArtist) {

        playerArtist.textContent =
            musica.artist || "";

    }


    audio.play();

}


// ==============================
// PESQUISA
// ==============================

searchInput?.addEventListener(
    "input",
    () => {

        const texto =
            searchInput.value
                .toLowerCase()
                .trim();


        const resultado =
            todasMusicas.filter((musica) => {

                return (

                    musica.title
                        ?.toLowerCase()
                        .includes(texto)

                    ||

                    musica.artist
                        ?.toLowerCase()
                        .includes(texto)

                    ||

                    musica.album
                        ?.toLowerCase()
                        .includes(texto)

                );

            });


        mostrarPesquisa(resultado);

    }
);


// ==============================
// MOSTRAR PESQUISA
// ==============================

function mostrarPesquisa(musicas) {

    if (!searchList) return;

    searchList.innerHTML = "";


    musicas.forEach((musica) => {

        const item =
            document.createElement("div");


        item.innerHTML = `

            <h3>
                ${musica.title || "Sem título"}
            </h3>

            <p>
                ${musica.artist || "Artista desconhecido"}
            </p>

            <button class="play-search">
                ▶ Tocar
            </button>

        `;


        item
            .querySelector(".play-search")
            .addEventListener(
                "click",
                () => {

                    tocarMusica(musica);

                }
            );


        searchList.appendChild(item);

    });

}


// ==============================
// ADICIONAR MÚSICA
// ==============================

const addMusicBtn =
    document.getElementById("add-music-btn");


addMusicBtn?.addEventListener(
    "click",
    async () => {


        if (!ehAdmin) {

            alert(
                "Você não tem permissão para adicionar músicas."
            );

            return;

        }


        const title =
            document
                .getElementById("music-title")
                .value
                .trim();


        const artist =
            document
                .getElementById("music-artist")
                .value
                .trim();


        const album =
            document
                .getElementById("music-album")
                .value
                .trim();


        const coverFile =
            document
                .getElementById("music-cover")
                .files[0];


        const audioFile =
            document
                .getElementById("music-audio")
                .files[0];


        const mensagem =
            document.getElementById(
                "admin-message"
            );


        // ==============================
        // VALIDAÇÃO
        // ==============================

        if (
            !title ||
            !artist ||
            !coverFile ||
            !audioFile
        ) {

            if (mensagem) {

                mensagem.textContent =
                    "Preencha título, artista, capa e música.";

            }

            return;

        }


        try {


            // ==============================
            // ENVIAR CAPA
            // ==============================

            if (mensagem) {

                mensagem.textContent =
                    "Enviando capa...";

            }


            const coverUrl =
                await enviarCloudinary(
                    coverFile
                );


            // ==============================
            // ENVIAR MÚSICA
            // ==============================

            if (mensagem) {

                mensagem.textContent =
                    "Enviando música...";

            }


            const audioUrl =
                await enviarCloudinary(
                    audioFile
                );


            // ==============================
            // SALVAR NO REALTIME DATABASE
            // ==============================

            if (mensagem) {

                mensagem.textContent =
                    "Salvando música...";

            }


            const novaMusicaRef =
                push(ref(db, "musicas"));


            await set(
                novaMusicaRef,
                {

                    title: title,

                    artist: artist,

                    album: album,

                    coverUrl: coverUrl,

                    audioUrl: audioUrl,

                    criadoEm: Date.now(),

                    criadoPor: usuarioAtual.uid

                }
            );


            // ==============================
            // FINAL
            // ==============================

            if (mensagem) {

                mensagem.textContent =
                    "Música adicionada com sucesso!";

            }


            // Limpa formulário

            document.getElementById(
                "music-title"
            ).value = "";


            document.getElementById(
                "music-artist"
            ).value = "";


            document.getElementById(
                "music-album"
            ).value = "";


            document.getElementById(
                "music-cover"
            ).value = "";


            document.getElementById(
                "music-audio"
            ).value = "";


        } catch (erro) {

            console.error(erro);


            if (mensagem) {

                mensagem.textContent =
                    "Erro ao adicionar música.";

            }

        }

    }
);


// ==============================
// PAINEL DO ADMIN
// ==============================

function mostrarMusicasAdmin(musicas) {

    if (!adminMusicList) return;


    adminMusicList.innerHTML = "";


    if (musicas.length === 0) {

        adminMusicList.innerHTML =
            "<p>Nenhuma música cadastrada.</p>";

        return;

    }


    musicas.forEach((musica) => {

        const item =
            document.createElement("div");


        item.className =
            "admin-music-item";


        item.innerHTML = `

            <div>

                <strong>
                    ${musica.title || "Sem título"}
                </strong>

                <p>
                    ${musica.artist || "Artista desconhecido"}
                </p>

            </div>

            <div>

                <button class="editar-musica">
                    Editar
                </button>

                <button class="excluir-musica">
                    Excluir
                </button>

            </div>

        `;


        // ==============================
        // EXCLUIR
        // ==============================

        const excluirBtn =
            item.querySelector(
                ".excluir-musica"
            );


        excluirBtn.addEventListener(
            "click",
            async () => {

                const confirmar =
                    confirm(
                        `Deseja excluir "${musica.title}"?`
                    );


                if (!confirmar) return;


                try {

                    await remove(
                        ref(
                            db,
                            `musicas/${musica.id}`
                        )
                    );


                    alert(
                        "Música excluída com sucesso!"
                    );


                } catch (erro) {

                    console.error(erro);

                    alert(
                        "Erro ao excluir música."
                    );

                }

            }
        );


        // ==============================
        // EDITAR
        // ==============================

        const editarBtn =
            item.querySelector(
                ".editar-musica"
            );


        editarBtn.addEventListener(
            "click",
            () => {

                editarMusica(musica);

            }
        );


        adminMusicList.appendChild(item);

    });

}


// ==============================
// EDITAR MÚSICA
// ==============================

async function editarMusica(musica) {

    if (!ehAdmin) {

        alert(
            "Você não tem permissão."
        );

        return;

    }


    const novoTitulo =
        prompt(
            "Novo título:",
            musica.title || ""
        );


    if (novoTitulo === null) return;


    const novoArtista =
        prompt(
            "Novo artista:",
            musica.artist || ""
        );


    if (novoArtista === null) return;


    const novoAlbum =
        prompt(
            "Novo álbum:",
            musica.album || ""
        );


    if (novoAlbum === null) return;


    try {

        await update(
            ref(
                db,
                `musicas/${musica.id}`
            ),
            {

                title: novoTitulo,

                artist: novoArtista,

                album: novoAlbum,

                atualizadoEm: Date.now()

            }
        );


        alert(
            "Música atualizada com sucesso!"
        );


    } catch (erro) {

        console.error(erro);


        alert(
            "Erro ao atualizar música."
        );

    }

}


// ==============================
// NAVEGAÇÃO
// ==============================

const botoesNavegacao =
    document.querySelectorAll(
        ".nav-item[data-section]"
    );


botoesNavegacao.forEach(
    (botao) => {

        botao.addEventListener(
            "click",
            () => {

                const section =
                    botao.dataset.section;


                document
                    .querySelectorAll(
                        ".page-section"
                    )
                    .forEach(
                        (secao) => {

                            secao.style.display =
                                "none";

                        }
                    );


                const secaoAtual =
                    document.getElementById(
                        `${section}-section`
                    );


                if (secaoAtual) {

                    secaoAtual.style.display =
                        "block";

                }


                document
                    .querySelectorAll(
                        ".nav-item"
                    )
                    .forEach(
                        (item) => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                botao.classList.add(
                    "active"
                );

            }
        );

    }
);