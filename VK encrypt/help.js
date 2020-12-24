$(document).ready(function() {
	$("#manual-button").click(function(){
		$("#manual-button").css("background", "lightgreen");
		$("#faq-button").css("background", "#edf0f5");
		$("#about-button").css("background", "#edf0f5");
		$("#manual").css("display", "");
		$("#faq").css("display", "none");
		$("#about").css("display", "none");}).click();
	$("#faq-button").click(function(){
		$("#manual-button").css("background", "#edf0f5");
		$("#faq-button").css("background", "lightgreen");
		$("#about-button").css("background", "#edf0f5");
		$("#manual").css("display", "none");
		$("#faq").css("display", "");
		$("#about").css("display", "none");});
	$("#about-button").click(function(){
		$("#manual-button").css("background", "#edf0f5");
		$("#faq-button").css("background", "#edf0f5");
		$("#about-button").css("background", "lightgreen");
		$("#manual").css("display", "none");
		$("#faq").css("display", "none");
		$("#about").css("display", "");});
}
);