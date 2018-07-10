
import { Socket } from './phoenix/assets/js/phoenix.js';
let LOCAL_NAME = '';
let CURRENT_NUMBER = '';
let CURRENT_OFFICE_ID = '';
let HOUR_FROM = '';
let HOUR_TO = '';
const UUID = '9bcf6729-8b40-424b-b96d-460f0d9bd4ef';
const SOCKET_CONNECT = 'wss://zeroq.cl/socket';
const URLBASE = 'https://zeroq.cl/';
const USERBASE = {
  name: '',
  email: '',
  rut: ''
};
let uid;

let userConnectOpen = false;
let GlobalChannel = [];
let channelData = [];

let SOCKET = new Socket(SOCKET_CONNECT, {
  params: {}
});

SOCKET.connect();

let weekday = new Array(7);
weekday[0] = "Domingo";
weekday[1] = "Lunes";
weekday[2] = "Martes";
weekday[3] = "Miercoles";
weekday[4] = "Jueves";
weekday[5] = "Viernes";
weekday[6] = "Sabado";


let monthname = new Array(12);
monthname[0] = "Enero";
monthname[1] = "Febrero";
monthname[2] = "Marzo";
monthname[3] = "Abril";
monthname[4] = "Mayo";
monthname[5] = "Junio";
monthname[6] = "Julio";
monthname[7] = "Agosto";
monthname[8] = "Septiembre";
monthname[9] = "Octubre";
monthname[10] = "Noviembre";
monthname[11] = "Diciembre";





(function(){
    console.log('function()');

    $('#oficina').change(function(){

      LOCAL_NAME = this.value.split(";")[0];
      CURRENT_OFFICE_ID = this.value.split(";")[1];
      uid = 'autopase:'+UUID+UUID+USERBASE.rut;
      init();

    })

    $('#servicio').change(function(){

      if( $('#oficina').val() == 0 && $('#servicio').val() == 0 ){
        return false;
      }
      getInformation();

    });

    $('#registrar_usuario').click(function(){

      if( !valid_rut($('#rut').val()) || !valid_email($('#email').val())){
        return false;
      };

      if($('#name').val() == ''){
        $('#error_name').text('Debe ingresar un nombre');
        return false;
      };

      USERBASE.name = $('#name').val().trim();
      USERBASE.email = $('#email').val().trim();
      USERBASE.rut = $('#rut').val().trim();
      $("#user_register").addClass("hide");
      $("#select_option").removeClass("hide");

    });


    $('#get_reservation').click(function(e){
      $('#modal-reserva').addClass("md-show");
      $('#modal-reserva').removeClass("md-hide");

      $('#calendar_choose').removeClass('hide');
      $('#calendar_choose').addClass('show');

      $('#calendar_response').removeClass('show');
      $('#calendar_response').addClass('hide');

    });

    $('#close_reserve').click( function(){

      $('#modal-reserva').removeClass("md-show");
      $('#modal-reserva').addClass("md-hide");

      $('#calendar_choose').removeClass('hide');
      $('#calendar_choose').addClass('show');

      $('#calendar_response').removeClass('show');
      $('#calendar_response').addClass('hide');

      $('#calendar_error').removeClass('show');
      $('#calendar_error').addClass('hide');
    });

    $('#close_attention').click( function(){

      $('#modal-atencion').addClass("md-hide");
      $('#modal-atencion').removeClass("md-show");

    });


    $('#reserve_hours').click(function(){
      reserve_hours();
    });
})();

function init(){
  console.log('function init()');

  if(userConnectOpen){
    connect_to_channel();
    return false;
  }

  let data = axios.post(URLBASE+'login/user', {
    uid: uid,
    user: USERBASE,
  }).then(function (response) {

    USERBASE.userId = response.data.data.id;
    USERBASE.token = response.data.data.token;
    userConnectOpen = true;
    console.log("TOKEN usuario: "  +USERBASE.token);
    console.log('usuario completo', response);
    connect_to_channel();
  }).catch(function (error) {
    console.log(error);
    changeClass('hide');
  });

}

function connect_to_channel(){


  console.log('function connect_to_channel()');
  console.log("TOKEN CANAL  : "  +USERBASE.token);
  GlobalChannel = SOCKET.channel(`web:${LOCAL_NAME}`, {token: USERBASE.token});

  GlobalChannel.join()
    .receive("ok", local => {
      console.log(`Entré al canal`, local);
      channelData = local;
      renderData();
    }).receive("error", res => {
      console.log(`No pude entrar al canal`, res)
  })

  // Se llamó un ticket
  GlobalChannel.on("call:created", call => {
    console.log("Call created!", call)
    if ( $('#servicio').val() == call.line_id){
      $('#attention_number').html('<span>Nº de Atención en Curso</span>'+call.prefix+call.number);
      $('#attention_number_next').html('<span>Nº de Atención Siguiente</span>'+call.prefix+(call.number + 1));
      CURRENT_NUMBER = call.prefix+call.number;
    }
  });

  // Se recibe el tiempo estimado de espera de la fila
  GlobalChannel.on("time:estimate", estimate => {
    console.log("time:estimate", estimate);
    if ( $('#servicio').val() == estimate.data.line_id){
      $('#estimate_time').text(estimate.data.waiting+' Minutos de espera');
    }
  });

  // Se recibe el tiempo estimado de espera de la fila
  GlobalChannel.on("ticket:created", ticket => {
    console.log("ticket:created", ticket.user_id);
    $("#modal-atencion").addClass("md-show");
    if(ticket.user_id === USERBASE.userId){
      $('#attention_number_person').text(ticket.prefix +ticket.number);
      $('#attention_number_current').text(CURRENT_NUMBER);
      console.log("mi ticket es : "+ ticket.prefix+'-'+ticket.number);
    }
  });

}

window.addEventListener('load', function(){

  let create  = document.querySelector("#create_ticket")

  create.addEventListener("click", event => {
    console.log("crear ticket");
    let line_id = $('#servicio').val();
    let user_id = USERBASE.userId;
    console.log("line_id : ", line_id);
    console.log("user_id : ", user_id);

    GlobalChannel.push("ticket:new", {
      line_id,
      user_id
    }, 10000)
     .receive("ok", (ticket) => console.log("created message", ticket) )
     .receive("error", (reasons) => console.log("create failed", reasons) )
     .receive("timeout", () => console.log("Networking issue...") );


  })

});


function renderData(){
  console.log('function renderData()');
  console.log(channelData);

  $('#office_name').text("Oficina "+channelData.name);
  $('#office_name_reserve').text("Oficina "+channelData.name);
  $('#office_name_attention').text("Oficina "+channelData.name);

  $('#office_street').text(channelData.street);
  $('#office_street_attention').text(channelData.street);
  $('#office_street_reserve').text(channelData.street);


  $('#servicio').empty().append('<option selected="selected" value="0">Selecciona un tipo de servicio</option>');

  axios.get(URLBASE+'api/v1/offices/'+CURRENT_OFFICE_ID+'/hours').then(function (response) {
    HOUR_FROM = response.data.data[0].from;
    HOUR_TO = response.data.data[0].to;
    calendar();
  }).catch(function (error) {
    console.log(error);
  });

  for (var i = 0; i < channelData.lines.length; i++) {
      $('#servicio').append($('<option>', {
            value: channelData.lines[i].id,
            text: channelData.lines[i].name
      }));
  }

}

function reserve_hours(){
  console.log($('#datetimepicker').val());

  var newDateObj = new Date();
  var oldDateObj = new Date($('#datetimepicker').val());


  newDateObj.setTime(oldDateObj.getTime() + (15 * 60 * 1000));

  let day = ("0" + ( newDateObj.getDate() )).slice(-2);
  let month = ("0" + (newDateObj.getMonth() + 1)).slice(-2);
  let year = newDateObj.getFullYear();
  let hours = ("0" + (newDateObj.getHours() )).slice(-2);
  let minute = ("0" + (newDateObj.getMinutes() )).slice(-2);


  const reserve = {
    from: $('#datetimepicker').val().replace(' ','T') + ':00',
    to: year+'-'+month+'-'+day+'T'+hours+':'+minute+':00',
    line_id: $('#servicio').val()
  };

  let data = axios.post(URLBASE+'api/v1/user/reserves',
    { reserve },
    { headers: { Authorization: USERBASE.token }
  }).then(function (response) {
    $('#text_response').text(textResponseReserve(oldDateObj));
    $('#calendar_choose').removeClass('show');
    $('#calendar_choose').addClass('hide');

    $('#calendar_response').removeClass('hide');
    $('#calendar_response').addClass('show');

  }).catch(function (error) {

    $('#calendar_choose').removeClass('show');
    $('#calendar_choose').addClass('hide');

    $('#calendar_error').removeClass('hide');
    $('#calendar_error').addClass('show');

  });

}

function getInformation(){

    var textSelect = $("#servicio option:selected").text();
    $('#service_name').text(textSelect);
    $('#service_name_attention').text(textSelect);
    var line = channelData.lines[ document.getElementById("servicio").selectedIndex - 1 ];
    $('#attention_number').html('<span>Nº de Atención en Curso</span>'+line.prefix+line.tickets);
    $('#attention_number_next').html('<span>Nº de Atención Siguiente</span>'+line.prefix+(line.tickets + 1));
    $('#estimate_time').text(line.waiting+' Minutos de espera');
    CURRENT_NUMBER = line.prefix+line.tickets;
    console.log(line);

    console.log('function getInformation()');
    changeClass('show')
}

function changeClass(param){
  console.log('function changeClass(param)');

  if( param == 'show'){
    $('#form-content-attention').removeClass('hide');
    $('#form-content-attention').addClass('show');
  }

  if( param == 'hide'){
    $('#form-content-attention').removeClass('show');
    $('#form-content-attention').addClass('hide');
  }
}

function calendar(){

  $.datetimepicker.setLocale('es');
  jQuery('#datetimepicker').datetimepicker({
    step:15,
    format:'Y-m-d H:i',
    inline:true,
    lang:'es',
    minDate:'yesterday',
    minTime:HOUR_FROM,
    maxTime:HOUR_TO,
    onGenerate:function( hu ) {
      jQuery(this).find('.xdsoft_date.xdsoft_day_of_week0').addClass('xdsoft_disabled');
    }
  });
}

function textResponseReserve(paramDate){
  return weekday[paramDate.getDay()]+' '+paramDate.getDate()+' de '+monthname[paramDate.getMonth()]+ ' ' +("0" + (paramDate.getHours() )).slice(-2) + ':' +("0" + (paramDate.getMinutes() )).slice(-2)+' hrs.';
}
