

const loginForm = document.getElementById("loginForm");

const message = document.getElementById("message");

loginForm.addEventListener("submit", async (e)=>{

    e.preventDefault();

    const email = document.getElementById("email").value;

    const password = document.getElementById("password").value;

    message.innerHTML = "Signing in...";

    const { data, error } =
        await sb.auth.signInWithPassword({

            email,

            password

        });

    if(error){

        message.innerHTML =
        "<span style='color:red'>" +
        error.message +
        "</span>";

        return;

    }

    message.innerHTML =
    "<span style='color:green'>Login Successful</span>";

    setTimeout(()=>{

        window.location.href="dashboard.html";

    },1000);

});