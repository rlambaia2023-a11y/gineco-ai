import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Baby, Sparkles, Phone, MapPin, ExternalLink } from "lucide-react";

export default function AdModal({ ad, onClose }) {
  if (!ad) return null;

  const SpecialtyIcon = ad.specialty === "ginecologia" ? Heart : 
                       ad.specialty === "obstetricia" ? Baby : Sparkles;

  return (
    <Dialog open={!!ad} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl lg:max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl md:text-2xl mb-2 pr-8">{ad.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={
                  ad.specialty === "ginecologia" ? "bg-pink-100 text-pink-700 border-pink-200" :
                  ad.specialty === "obstetricia" ? "bg-blue-100 text-blue-700 border-blue-200" :
                  "bg-purple-100 text-purple-700 border-purple-200"
                }>
                  <SpecialtyIcon className="w-3 h-3 mr-1" />
                  {ad.specialty === "ginecologia" ? "Ginecologia" :
                   ad.specialty === "obstetricia" ? "Obstetrícia" : "Ambos"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-auto max-h-[calc(90vh-100px)]">
          {ad.image_url && (
            <div className="w-full bg-gray-50 border-y border-gray-200">
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full max-h-[40vh] sm:max-h-[50vh] md:max-h-[60vh] object-contain"
              />
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                Local
              </h3>
              <p className="text-base sm:text-lg font-medium text-gray-800">{ad.clinic_name}</p>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-2">
                Sobre
              </h3>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {ad.description}
              </p>
            </div>

            {ad.contact_phone && (
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  Contato
                </h3>
                <a 
                  href={`tel:${ad.contact_phone.replace(/\D/g, '')}`}
                  className="text-base sm:text-lg font-medium text-blue-600 hover:text-blue-800"
                >
                  {ad.contact_phone}
                </a>
              </div>
            )}

            {ad.website_link && (
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-2">
                  Site / Rede Social
                </h3>
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-base"
                  asChild
                >
                  <a
                    href={ad.website_link.startsWith('http') ? ad.website_link : `https://${ad.website_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Visitar
                  </a>
                </Button>
              </div>
            )}

            <div className="pt-3 sm:pt-4 border-t text-xs text-gray-500">
              <p>Publicado por: {ad.created_by}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}