// ==============================
// CONFIGURAÇÃO E IMPORTS
// ==============================

import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";


// ==============================
// CLOUDINARY
// ==============================

const CLOUD_NAME = "jyiqffg6";
const UPLOAD_PRESET = "soundflow";

async function enviarCloudinary(arquivo) {
  const formData = new FormData();

  formData.append("file", arquivo);
  formData.append("upload_preset", UPLOAD_PRESET);

  const resposta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const dados = await resposta.json();

  console.log("Resposta do Cloudinary:", dados);

  if (!resposta.ok) {
    throw new Error(
      dados.error?.message || "Erro ao enviar arquivo."
    );
  }

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

    await set(ref(db, `usuarios/${user.uid}`), {
      nome: email.split("@")[0],
      role: "user",
      criadoEm: Date.now(),
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

    authMessage.textContent = "Email ou senha incorretos.";
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

    console.log(
      "Usuário encontrado no Realtime Database:",
      snapshot.exists()
    );


    if (snapshot.exists()) {

      const dados = snapshot.val();

      console.log("Dados do usuário:", dados);

      console.log("Role:", dados.role);

      ehAdmin = dados.role === "admin";

    } else {

      console.log(
        "Usuário não encontrado no Realtime Database."
      );

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

  const musicasRef = ref(
    db,
    "musicas"
  );

  onValue(
    musicasRef,

    (snapshot) => {

      todasMusicas = [];


      if (snapshot.exists()) {

        snapshot.forEach((childSnapshot) => {

          todasMusicas.push({

            id: childSnapshot.key,

            ...childSnapshot.val(),

          });

        });

      }


      console.log(
        "Músicas carregadas:",
        todasMusicas
      );


      mostrarMusicas(todasMusicas);


      if (ehAdmin) {

        mostrarMusicasAdmin(
          todasMusicas
        );

      }

    },


    (erro) => {

      console.error(
        "Erro ao carregar músicas:",
        erro
      );

    },
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


    card.className =
      "music-card";


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
      card.querySelector(
        ".play-music"
      );


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
// PLAYER
// ==============================

let musicaAtual = 0;


// ==============================
// TOCAR MÚSICA
// ==============================

function tocarMusica(musica) {

  const indice =
    todasMusicas.findIndex(
      (item) =>
        item.id === musica.id
    );


  if (indice !== -1) {

    musicaAtual = indice;

  }


  if (!audio) return;


  audio.src =
    musica.audioUrl;


  if (playerTitle) {

    playerTitle.textContent =
      musica.title ||
      "Sem título";

  }


  if (playerArtist) {

    playerArtist.textContent =
      musica.artist ||
      "Artista desconhecido";

  }


  audio.play();

}


// ==============================
// PAUSAR / CONTINUAR
// ==============================

function pausarMusica() {

  if (!audio) return;


  if (audio.paused) {

    audio.play();

  } else {

    audio.pause();

  }

}


// ==============================
// PRÓXIMA MÚSICA
// ==============================

function proximaMusica() {

  if (todasMusicas.length === 0) return;


  musicaAtual++;


  if (
    musicaAtual >=
    todasMusicas.length
  ) {

    musicaAtual = 0;

  }


  tocarMusica(
    todasMusicas[musicaAtual]
  );

}


// ==============================
// MÚSICA ANTERIOR
// ==============================

function musicaAnterior() {

  if (todasMusicas.length === 0) return;


  musicaAtual--;


  if (musicaAtual < 0) {

    musicaAtual =
      todasMusicas.length - 1;

  }


  tocarMusica(
    todasMusicas[musicaAtual]
  );

}


// ==============================
// QUANDO A MÚSICA TERMINAR
// ==============================

audio?.addEventListener(
  "ended",
  () => {

    proximaMusica();

  }
);


// ==============================
// BOTÕES DO PLAYER
// ==============================

const botoesPlayer =
  document.querySelectorAll(
    ".player-buttons button"
  );


const botaoAnterior =
  botoesPlayer[1];


const botaoPlay =
  botoesPlayer[2];


const botaoProximo =
  botoesPlayer[3];


// ANTERIOR

botaoAnterior?.addEventListener(
  "click",
  () => {

    musicaAnterior();

  }
);


// PLAY / PAUSE

botaoPlay?.addEventListener(
  "click",
  () => {

    pausarMusica();

  }
);


// PRÓXIMA

botaoProximo?.addEventListener(
  "click",
  () => {

    proximaMusica();

  }
);


// MUDAR ÍCONE PARA PAUSE

audio?.addEventListener(
  "play",
  () => {

    if (botaoPlay) {

      botaoPlay.textContent =
        "⏸";

    }

  }
);


// MUDAR ÍCONE PARA PLAY

audio?.addEventListener(
  "pause",
  () => {

    if (botaoPlay) {

      botaoPlay.textContent =
        "▶";

    }

  }
);


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
      todasMusicas.filter(
        (musica) => {

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

        }
      );


    console.log(
      "Pesquisa:",
      texto
    );


    console.log(
      "Resultados:",
      resultado
    );


    mostrarPesquisa(
      resultado
    );


    // Abre a página de busca

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


    const searchSection =
      document.getElementById(
        "search-section"
      );


    if (searchSection) {

      searchSection.style.display =
        "block";

    }


    // Ativa o botão Buscar

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


    const botaoBuscar =
      document.querySelector(
        '.nav-item[data-section="search"]'
      );


    if (botaoBuscar) {

      botaoBuscar.classList.add(
        "active"
      );

    }

  }
);


// ==============================
// MOSTRAR PESQUISA
// ==============================

function mostrarPesquisa(musicas) {

  if (!searchList) return;


  searchList.innerHTML = "";


  if (musicas.length === 0) {

    searchList.innerHTML =
      "<p>Nenhuma música encontrada.</p>";

    return;

  }


  musicas.forEach(
    (musica) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "search-result";


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


      const botao =
        item.querySelector(
          ".play-search"
        );


      botao.addEventListener(
        "click",
        () => {

          tocarMusica(musica);

        }
      );


      searchList.appendChild(
        item
      );

    }
  );

}


// ==============================
// ADICIONAR MÚSICA
// ==============================

const addMusicBtn =
  document.getElementById(
    "add-music-btn"
  );


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
        .getElementById(
          "music-title"
        )
        .value
        .trim();


    const artist =
      document
        .getElementById(
          "music-artist"
        )
        .value
        .trim();


    const album =
      document
        .getElementById(
          "music-album"
        )
        .value
        .trim();


    const coverFile =
      document
        .getElementById(
          "music-cover"
        )
        .files[0];


    const audioFile =
      document
        .getElementById(
          "music-audio"
        )
        .files[0];


    const mensagem =
      document.getElementById(
        "admin-message"
      );


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

      // Enviar capa

      if (mensagem) {

        mensagem.textContent =
          "Enviando capa...";

      }


      const coverUrl =
        await enviarCloudinary(
          coverFile
        );


      // Enviar música

      if (mensagem) {

        mensagem.textContent =
          "Enviando música...";

      }


      const audioUrl =
        await enviarCloudinary(
          audioFile
        );


      // Salvar no Firebase

      if (mensagem) {

        mensagem.textContent =
          "Salvando música...";

      }


      const novaMusicaRef =
        push(
          ref(db, "musicas")
        );


      await set(
        novaMusicaRef,
        {

          title: title,

          artist: artist,

          album: album,

          coverUrl: coverUrl,

          audioUrl: audioUrl,

          criadoEm: Date.now(),

          criadoPor:
            usuarioAtual.uid,

        }
      );


      if (mensagem) {

        mensagem.textContent =
          "Música adicionada com sucesso!";

      }


      // Limpar formulário

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

function mostrarMusicasAdmin(
  musicas
) {

  if (!adminMusicList) return;


  adminMusicList.innerHTML =
    "";


  if (musicas.length === 0) {

    adminMusicList.innerHTML =
      "<p>Nenhuma música cadastrada.</p>";

    return;

  }


  musicas.forEach(
    (musica) => {

      const item =
        document.createElement(
          "div"
        );


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

            console.error(
              erro
            );


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

          editarMusica(
            musica
          );

        }
      );


      adminMusicList.appendChild(
        item
      );

    }
  );

}


// ==============================
// EDITAR MÚSICA
// ==============================

async function editarMusica(
  musica
) {

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


  if (novoTitulo === null)
    return;


  const novoArtista =
    prompt(
      "Novo artista:",
      musica.artist || ""
    );


  if (novoArtista === null)
    return;


  const novoAlbum =
    prompt(
      "Novo álbum:",
      musica.album || ""
    );


  if (novoAlbum === null)
    return;


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

        atualizadoEm:
          Date.now(),

      }
    );


    alert(
      "Música atualizada com sucesso!"
    );


  } catch (erro) {

    console.error(
      erro
    );


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


        // Esconder todas as páginas

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


        // Mostrar página escolhida

        const secaoAtual =
          document.getElementById(
            `${section}-section`
          );


        if (secaoAtual) {

          secaoAtual.style.display =
            "block";

        }


        // Remover active

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


        // Adicionar active

        botao.classList.add(
          "active"
        );

      }
    );

  }
);